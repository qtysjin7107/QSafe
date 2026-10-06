from __future__ import annotations

import argparse
from dataclasses import dataclass

import numpy as np
import pandas as pd
from scipy.stats import norm


RESULTS_FILE = "experiments/qkd_experiment_results.csv"


@dataclass
class QBERDistribution:
    mean: float
    std: float


@dataclass
class QBEREvidence:
    observed_qber: float
    noise_rate: float
    attack_eve_probability: float

    honest_mean: float
    honest_std: float

    attack_mean: float
    attack_std: float

    likelihood_honest: float
    likelihood_attack: float

    likelihood_ratio: float
    posterior_eve_probability: float


class QBERModel:
    """
    Statistical model for distinguishing:

        H0 = honest noisy channel
        H1 = channel under eavesdropping

    The model is calibrated from the QKD experiment CSV.
    """

    def __init__(self, csv_file: str = RESULTS_FILE):
        self.csv_file = csv_file
        self.df = pd.read_csv(csv_file)

        required_columns = {
            "noise_rate",
            "eve_probability",
            "mean_qber",
            "std_qber",
        }

        missing = required_columns - set(self.df.columns)

        if missing:
            raise ValueError(
                f"Missing required columns: {sorted(missing)}"
            )

    # ---------------------------------------------------------
    # Find the closest experimentally measured configuration
    # ---------------------------------------------------------

    def _find_row(
        self,
        noise_rate: float,
        eve_probability: float,
    ) -> pd.Series:

        subset = self.df.copy()

        subset["distance"] = (
            (subset["noise_rate"] - noise_rate).abs()
            +
            (subset["eve_probability"] - eve_probability).abs()
        )

        row = subset.loc[
            subset["distance"].idxmin()
        ]

        return row

    # ---------------------------------------------------------
    # Honest-channel distribution
    # ---------------------------------------------------------

    def honest_distribution(
        self,
        noise_rate: float,
    ) -> QBERDistribution:

        row = self._find_row(
            noise_rate=noise_rate,
            eve_probability=0.0,
        )

        std = float(row["std_qber"])

        # Prevent a zero-variance distribution.
        std = max(std, 1e-4)

        return QBERDistribution(
            mean=float(row["mean_qber"]),
            std=std,
        )

    # ---------------------------------------------------------
    # Attack distribution
    # ---------------------------------------------------------

    def attack_distribution(
        self,
        noise_rate: float,
        eve_probability: float,
    ) -> QBERDistribution:

        row = self._find_row(
            noise_rate=noise_rate,
            eve_probability=eve_probability,
        )

        std = float(row["std_qber"])
        std = max(std, 1e-4)

        return QBERDistribution(
            mean=float(row["mean_qber"]),
            std=std,
        )

    # ---------------------------------------------------------
    # Bayesian evidence calculation
    # ---------------------------------------------------------

    def evaluate(
        self,
        observed_qber: float,
        noise_rate: float,
        attack_eve_probability: float = 0.10,
        prior_eve_probability: float = 0.50,
    ) -> QBEREvidence:

        if not 0.0 <= observed_qber <= 1.0:
            raise ValueError(
                "observed_qber must be between 0 and 1"
            )

        if not 0.0 <= noise_rate <= 1.0:
            raise ValueError(
                "noise_rate must be between 0 and 1"
            )

        if not 0.0 <= prior_eve_probability <= 1.0:
            raise ValueError(
                "prior_eve_probability must be between 0 and 1"
            )

        honest = self.honest_distribution(
            noise_rate
        )

        attack = self.attack_distribution(
            noise_rate,
            attack_eve_probability,
        )

        # -----------------------------------------------------
        # Likelihoods
        # -----------------------------------------------------

        likelihood_honest = norm.pdf(
            observed_qber,
            loc=honest.mean,
            scale=honest.std,
        )

        likelihood_attack = norm.pdf(
            observed_qber,
            loc=attack.mean,
            scale=attack.std,
        )

        # -----------------------------------------------------
        # Likelihood ratio
        #
        # > 1  -> evidence favors attack
        # < 1  -> evidence favors honest channel
        # -----------------------------------------------------

        likelihood_ratio = (
            likelihood_attack
            /
            max(likelihood_honest, 1e-300)
        )

        # -----------------------------------------------------
        # Bayes:
        #
        # P(E | Q) =
        # P(Q | E) P(E)
        # ------------------------------
        # P(Q | E)P(E) +
        # P(Q | H)P(H)
        # -----------------------------------------------------

        prior_e = prior_eve_probability
        prior_h = 1.0 - prior_e

        numerator = (
            likelihood_attack
            * prior_e
        )

        denominator = (
            numerator
            +
            likelihood_honest * prior_h
        )

        posterior = (
            numerator / denominator
            if denominator > 0
            else prior_e
        )

        return QBEREvidence(
            observed_qber=observed_qber,
            noise_rate=noise_rate,
            attack_eve_probability=attack_eve_probability,

            honest_mean=honest.mean,
            honest_std=honest.std,

            attack_mean=attack.mean,
            attack_std=attack.std,

            likelihood_honest=likelihood_honest,
            likelihood_attack=likelihood_attack,

            likelihood_ratio=likelihood_ratio,
            posterior_eve_probability=posterior,
        )


# =============================================================
# COMMAND-LINE DEMO
# =============================================================

def main():

    parser = argparse.ArgumentParser(
        description="Q-Safe QBER evidence model"
    )

    parser.add_argument(
        "--noise",
        type=float,
        default=0.02,
        help="Estimated honest-channel noise."
    )

    parser.add_argument(
        "--observed",
        type=float,
        default=0.05,
        help="Observed QBER."
    )

    parser.add_argument(
        "--eve",
        type=float,
        default=0.10,
        help="Representative Eve probability used for calibration."
    )

    parser.add_argument(
        "--prior",
        type=float,
        default=0.50,
        help="Prior probability of Eve."
    )

    args = parser.parse_args()

    model = QBERModel()

    result = model.evaluate(
        observed_qber=args.observed,
        noise_rate=args.noise,
        attack_eve_probability=args.eve,
        prior_eve_probability=args.prior,
    )

    print("=" * 70)
    print("Q-SAFE — QBER EVIDENCE MODEL")
    print("=" * 70)

    print()
    print(f"Observed QBER       : {result.observed_qber:.4%}")
    print(f"Estimated noise     : {result.noise_rate:.2%}")

    print()
    print("HONEST CHANNEL")
    print(
        f"Mean QBER           : "
        f"{result.honest_mean:.4%}"
    )
    print(
        f"Std QBER            : "
        f"{result.honest_std:.4%}"
    )

    print()
    print("ATTACK CHANNEL")
    print(
        f"Eve probability     : "
        f"{result.attack_eve_probability:.2%}"
    )
    print(
        f"Mean QBER           : "
        f"{result.attack_mean:.4%}"
    )
    print(
        f"Std QBER            : "
        f"{result.attack_std:.4%}"
    )

    print()
    print("EVIDENCE")
    print(
        f"P(QBER | Honest)    : "
        f"{result.likelihood_honest:.6g}"
    )
    print(
        f"P(QBER | Attack)    : "
        f"{result.likelihood_attack:.6g}"
    )

    print()
    print(
        f"Likelihood ratio    : "
        f"{result.likelihood_ratio:.4f}"
    )

    print(
        f"Prior Eve           : "
        f"{args.prior:.2%}"
    )

    print(
        f"Posterior Eve       : "
        f"{result.posterior_eve_probability:.2%}"
    )

    print()

    if result.likelihood_ratio > 1:
        print(
            "Quantum evidence → favors EAVESDROPPING"
        )
    else:
        print(
            "Quantum evidence → favors HONEST CHANNEL"
        )


if __name__ == "__main__":
    main()