from quantum.experiment_runner import run_configuration
from quantum.qber_model import QBERModel


DEFAULT_TRIALS = 10
DEFAULT_BITS_PER_TRIAL = 100

DEFAULT_ATTACK_EVE_PROBABILITY = 0.10
DEFAULT_PRIOR_EVE_PROBABILITY = 0.50


def run_quantum_security(
    noise_rate: float = 0.0,
    eve_probability: float = 0.0,
    trials: int = DEFAULT_TRIALS,
    n_bits: int = DEFAULT_BITS_PER_TRIAL,
) -> dict:
    """
    Run repeated BB84 trials and evaluate the mean QBER
    against the experimentally calibrated honest/attack model.
    """

    experiment = run_configuration(
        noise_rate=noise_rate,
        eve_probability=eve_probability,
        trials=trials,
        n_bits=n_bits,
    )

    observed_qber = float(
        experiment["mean_qber"]
    )

    qber_model = QBERModel()

    evidence = qber_model.evaluate(
        observed_qber=observed_qber,
        noise_rate=noise_rate,
        attack_eve_probability=DEFAULT_ATTACK_EVE_PROBABILITY,
        prior_eve_probability=DEFAULT_PRIOR_EVE_PROBABILITY,
    )

    expected_qber = float(
        evidence.honest_mean
    )

    quantum_anomaly = max(
        0.0,
        observed_qber - expected_qber
    )

    return {
        "qber": observed_qber,
        "qber_std": float(
            experiment["std_qber"]
        ),
        "min_qber": float(
            experiment["min_qber"]
        ),
        "max_qber": float(
            experiment["max_qber"]
        ),

        "expected_qber": expected_qber,
        "expected_qber_std": float(
            evidence.honest_std
        ),

        "quantum_anomaly": quantum_anomaly,

        "likelihood_honest": float(
            evidence.likelihood_honest
        ),
        "likelihood_attack": float(
            evidence.likelihood_attack
        ),
        "likelihood_ratio": float(
            evidence.likelihood_ratio
        ),

        "quantum_attack_probability": float(
            evidence.posterior_eve_probability
        ),

        "noise_rate": float(
            noise_rate
        ),
        "eve_probability": float(
            eve_probability
        ),

        "trials": int(
            experiment["trials"]
        ),
        "bits_per_trial": int(
            experiment["bits_per_trial"]
        ),
        "mean_sifted_key_length": float(
            experiment["mean_sifted_key_length"]
        ),
    }