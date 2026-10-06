import json
from functools import lru_cache
from pathlib import Path

from backend.services.hybrid_service import analyze_security


PROJECT_ROOT = Path(__file__).resolve().parents[2]

DEMO_SAMPLES_PATH = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "demo_samples.json"
)


@lru_cache(maxsize=1)
def load_demo_samples():
    if not DEMO_SAMPLES_PATH.exists():
        raise FileNotFoundError(
            f"Demo samples not found at: {DEMO_SAMPLES_PATH}"
        )

    with open(
        DEMO_SAMPLES_PATH,
        "r",
        encoding="utf-8",
    ) as file:
        return json.load(file)


def run_demo(
    mode: str,
    n_bits: int = 100,
    trials: int = 10,
) -> dict:

    mode = mode.upper()

    samples = load_demo_samples()

    normal_features = samples["normal"]["features"]
    attack_features = samples["attack"]["features"]

    scenarios = {
        "NORMAL": {
            "network": normal_features,
            "noise_rate": 0.0,
            "eve_probability": 0.0,
        },
        "NOISY_CHANNEL": {
            "network": normal_features,
            "noise_rate": 0.05,
            "eve_probability": 0.0,
        },
        "NETWORK_ATTACK": {
            "network": attack_features,
            "noise_rate": 0.0,
            "eve_probability": 0.0,
        },
        "EAVESDROPPER": {
            "network": normal_features,
            "noise_rate": 0.0,
            "eve_probability": 0.50,
        },
        "COMBINED_ATTACK": {
            "network": attack_features,
            "noise_rate": 0.05,
            "eve_probability": 0.50,
        },
    }

    if mode not in scenarios:
        raise ValueError(
            "Unknown demo mode. Choose from: "
            + ", ".join(scenarios.keys())
        )

    scenario = scenarios[mode]

    result = analyze_security(
        network_features=scenario["network"],
        n_bits=n_bits,
        trials=trials,
        noise_rate=scenario["noise_rate"],
        eve_probability=scenario["eve_probability"],
    )

    return {
        "mode": mode,
        "result": result,
    }