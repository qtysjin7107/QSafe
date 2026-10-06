import json
from functools import lru_cache
from pathlib import Path

import joblib
import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]

MODEL_PATH = (
    PROJECT_ROOT
    / "models"
    / "threat_model_best.joblib"
)

INFO_PATH = (
    PROJECT_ROOT
    / "models"
    / "threat_model_info.json"
)

CATEGORICAL_FEATURES = [
    "protocol_type",
    "service",
    "flag",
]


@lru_cache(maxsize=1)
def load_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Best threat model not found at: {MODEL_PATH}"
        )

    return joblib.load(MODEL_PATH)


@lru_cache(maxsize=1)
def load_model_info():
    if not INFO_PATH.exists():
        raise FileNotFoundError(
            f"Threat model information not found at: {INFO_PATH}"
        )

    with open(INFO_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


def get_threshold() -> float:
    info = load_model_info()

    threshold = info.get("threshold")

    if threshold is None:
        threshold = info.get("best_threshold")

    if threshold is None:
        threshold = info.get("optimal_threshold")

    if threshold is None:
        raise KeyError(
            "No classification threshold found in "
            "threat_model_info.json"
        )

    threshold = float(threshold)

    if not 0.0 < threshold < 1.0:
        raise ValueError(
            f"Invalid classification threshold: {threshold}"
        )

    return threshold


def prepare_sample(
    network_features: dict,
    model
) -> pd.DataFrame:

    sample = pd.DataFrame(
        [network_features]
    )

    for feature in CATEGORICAL_FEATURES:
        if feature not in sample.columns:
            raise ValueError(
                f"Missing required categorical feature: {feature}"
            )

    # Our best model is a native LightGBM model.
    # It remembers the exact categorical values used during training.
    booster = getattr(model, "booster_", None)

    if booster is not None:
        pandas_categorical = getattr(
            booster,
            "pandas_categorical",
            None
        )

        if pandas_categorical is not None:
            if len(pandas_categorical) != len(CATEGORICAL_FEATURES):
                raise ValueError(
                    "Number of stored categorical feature definitions "
                    "does not match the expected NSL-KDD categorical features."
                )

            for feature, categories in zip(
                CATEGORICAL_FEATURES,
                pandas_categorical
            ):
                sample[feature] = pd.Categorical(
                    sample[feature],
                    categories=categories
                )

    return sample


def predict_threat(
    network_features: dict
) -> dict:

    model = load_model()
    threshold = get_threshold()

    sample = prepare_sample(
        network_features,
        model
    )

    probabilities = model.predict_proba(
        sample
    )[0]

    class_labels = list(
        model.classes_
    )

    if 1 not in class_labels:
        raise ValueError(
            "The trained model does not contain "
            "the attack class '1'."
        )

    attack_index = class_labels.index(1)

    attack_probability = float(
        probabilities[attack_index]
    )

    label = (
        "attack"
        if attack_probability >= threshold
        else "normal"
    )

    return {
        "label": label,
        "threat_probability": attack_probability,
        "threshold": threshold,
    }