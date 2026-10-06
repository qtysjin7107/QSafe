from pathlib import Path

import joblib
import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]

MODEL_PATH = (
    PROJECT_ROOT
    / "models"
    / "threat_model.joblib"
)


def load_model():

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            "Threat model not found. "
            "Run: python -m ml.train"
        )

    return joblib.load(
        MODEL_PATH
    )


def predict_threat(
    network_features: dict
) -> dict:

    model = load_model()

    sample = pd.DataFrame(
        [network_features]
    )

    prediction = int(
        model.predict(sample)[0]
    )

    probabilities = model.predict_proba(
        sample
    )[0]

    class_labels = list(
        model.classes_
    )

    attack_index = class_labels.index(1)

    attack_probability = float(
        probabilities[attack_index]
    )

    return {
        "label": (
            "attack"
            if prediction == 1
            else "normal"
        ),
        "threat_probability": attack_probability,
    }