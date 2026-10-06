from __future__ import annotations

import csv
from pathlib import Path
from statistics import mean, stdev

from .bb84 import run_bb84


# ============================================================
# EXPERIMENT CONFIGURATION
# ============================================================

NOISE_LEVELS = [
    0.00,
    0.01,
    0.02,
    0.05,
]

EVE_LEVELS = [
    0.00,
    0.05,
    0.10,
    0.25,
    0.50,
    1.00,
]

TRIALS_PER_CONFIGURATION = 10

BITS_PER_TRIAL = 1000


# ============================================================
# OUTPUT
# ============================================================

OUTPUT_DIR = Path("experiments")
OUTPUT_DIR.mkdir(exist_ok=True)

OUTPUT_FILE = OUTPUT_DIR / "qkd_experiment_results.csv"


# ============================================================
# RUN ONE CONFIGURATION
# ============================================================

def run_configuration(
    noise_rate: float,
    eve_probability: float,
    trials: int = TRIALS_PER_CONFIGURATION,
    n_bits: int = BITS_PER_TRIAL,
) -> dict:

    qbers = []
    sifted_lengths = []

    for trial in range(trials):

        result = run_bb84(
            n_bits=n_bits,
            noise_rate=noise_rate,
            eve_probability=eve_probability,
        )

        qbers.append(result.qber)
        sifted_lengths.append(
            len(result.sifted_alice_key)
        )

    average_qber = mean(qbers)

    qber_std = (
        stdev(qbers)
        if len(qbers) > 1
        else 0.0
    )

    average_sifted_length = mean(
        sifted_lengths
    )

    return {
        "noise_rate": noise_rate,
        "eve_probability": eve_probability,
        "trials": trials,
        "bits_per_trial": n_bits,
        "mean_qber": average_qber,
        "std_qber": qber_std,
        "min_qber": min(qbers),
        "max_qber": max(qbers),
        "mean_sifted_key_length": average_sifted_length,
    }


# ============================================================
# RUN FULL MATRIX
# ============================================================

def run_full_experiment():

    results = []

    total = (
        len(NOISE_LEVELS)
        * len(EVE_LEVELS)
    )

    current = 0

    print("=" * 80)
    print("Q-SAFE — QUANTUM CHANNEL EXPERIMENT")
    print("=" * 80)

    print()
    print(
        f"Configurations : {total}"
    )
    print(
        f"Trials/config  : {TRIALS_PER_CONFIGURATION}"
    )
    print(
        f"Bits/trial     : {BITS_PER_TRIAL}"
    )

    print()

    for noise_rate in NOISE_LEVELS:

        for eve_probability in EVE_LEVELS:

            current += 1

            print(
                f"[{current}/{total}] "
                f"noise={noise_rate:.2%}, "
                f"Eve={eve_probability:.2%}"
            )

            result = run_configuration(
                noise_rate=noise_rate,
                eve_probability=eve_probability,
            )

            results.append(result)

            print(
                f"    mean QBER = "
                f"{result['mean_qber']:.4%}"
            )


    # ========================================================
    # SAVE CSV
    # ========================================================

    fieldnames = [
        "noise_rate",
        "eve_probability",
        "trials",
        "bits_per_trial",
        "mean_qber",
        "std_qber",
        "min_qber",
        "max_qber",
        "mean_sifted_key_length",
    ]

    with OUTPUT_FILE.open(
        "w",
        newline="",
        encoding="utf-8",
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=fieldnames,
        )

        writer.writeheader()

        writer.writerows(results)

    print()
    print("=" * 80)
    print("EXPERIMENT COMPLETE")
    print("=" * 80)
    print()
    print(
        f"Saved results to:"
        f" {OUTPUT_FILE}"
    )


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    run_full_experiment()