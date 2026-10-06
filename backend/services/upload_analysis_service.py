from __future__ import annotations

import io
from typing import Any

import pandas as pd

from backend.services.decision_service import make_security_decision
from backend.services.qkd_service import run_quantum_security

NSL_COLUMNS = [
    "duration","protocol_type","service","flag","src_bytes","dst_bytes","land",
    "wrong_fragment","urgent","hot","num_failed_logins","logged_in",
    "num_compromised","root_shell","su_attempted","num_root","num_file_creations",
    "num_shells","num_access_files","num_outbound_cmds","is_host_login",
    "is_guest_login","count","srv_count","serror_rate","srv_serror_rate",
    "rerror_rate","srv_rerror_rate","same_srv_rate","diff_srv_rate",
    "srv_diff_host_rate","dst_host_count","dst_host_srv_count",
    "dst_host_same_srv_rate","dst_host_diff_srv_rate",
    "dst_host_same_src_port_rate","dst_host_srv_diff_host_rate",
    "dst_host_serror_rate","dst_host_srv_serror_rate","dst_host_rerror_rate",
    "dst_host_srv_rerror_rate","label","difficulty",
]

FEATURE_COLUMNS = NSL_COLUMNS[:41]
CATEGORICAL_FEATURES = ["protocol_type", "service", "flag"]
MAX_UPLOAD_ROWS = 250_000


def _normalise_columns(columns: list[Any]) -> list[str]:
    return [
        str(column).strip().lower().lstrip("\ufeff")
        for column in columns
    ]


def _drop_trailing_empty_columns(df: pd.DataFrame) -> pd.DataFrame:
    while df.shape[1] > len(NSL_COLUMNS):
        last = df.iloc[:, -1]
        if last.isna().all() or last.astype(str).str.strip().eq("").all():
            df = df.iloc[:, :-1]
        else:
            break
    return df


def _load_nsl_dataframe(file_bytes: bytes, filename: str) -> pd.DataFrame:
    if not file_bytes:
        raise ValueError("The uploaded file is empty.")

    suffix = filename.lower().rsplit(".", 1)[-1] if "." in filename else "txt"
    if suffix not in {"csv", "txt"}:
        raise ValueError("Upload a CSV or TXT file in NSL-KDD format.")

    raw = io.BytesIO(file_bytes)
    probe = pd.read_csv(raw, header=None, nrows=3)
    first_row = _normalise_columns(probe.iloc[0].tolist())
    has_header = bool(first_row) and first_row[0] == "duration"

    raw.seek(0)
    if has_header:
        df = pd.read_csv(raw)
        df.columns = _normalise_columns(df.columns.tolist())
    else:
        df = pd.read_csv(raw, header=None)

    df = _drop_trailing_empty_columns(df)

    if df.shape[1] == 43:
        df.columns = NSL_COLUMNS
    elif df.shape[1] == 41:
        df.columns = FEATURE_COLUMNS
    elif set(FEATURE_COLUMNS).issubset(df.columns):
        ordered = FEATURE_COLUMNS.copy()
        if "label" in df.columns:
            ordered.append("label")
        if "difficulty" in df.columns:
            ordered.append("difficulty")
        df = df[ordered]
    else:
        raise ValueError(
            f"Unsupported file shape: {df.shape[1]} columns. "
            "Expected 41 NSL-KDD features, 43 columns with label+difficulty, "
            "or the same file with an empty trailing field."
        )

    if len(df) == 0:
        raise ValueError("The uploaded dataset contains no rows.")
    if len(df) > MAX_UPLOAD_ROWS:
        raise ValueError(
            f"Dataset has {len(df):,} rows. Maximum supported size is "
            f"{MAX_UPLOAD_ROWS:,} rows."
        )

    return df


def _prepare_for_model(df: pd.DataFrame) -> pd.DataFrame:
    from ml.predict import load_model

    model = load_model()
    sample = df[FEATURE_COLUMNS].copy()

    booster = getattr(model, "booster_", None)
    stored_categories = getattr(booster, "pandas_categorical", None)

    if stored_categories is not None:
        if len(stored_categories) != len(CATEGORICAL_FEATURES):
            raise ValueError("Stored LightGBM categorical metadata is incompatible with NSL-KDD.")

        for feature, categories in zip(CATEGORICAL_FEATURES, stored_categories):
            values = set(sample[feature].astype(str).str.strip())
            unknown = sorted(values - set(categories))
            if unknown:
                raise ValueError(
                    f"Unsupported {feature} value(s): {unknown[:8]}. "
                    "The upload contains categories outside the trained model."
                )
            sample[feature] = pd.Categorical(
                sample[feature],
                categories=categories,
            )

    return sample


def _classical_analysis(df: pd.DataFrame) -> dict:
    from ml.predict import get_threshold, load_model
    from sklearn.metrics import (
        accuracy_score,
        confusion_matrix,
        f1_score,
        precision_score,
        recall_score,
    )

    model_input = _prepare_for_model(df)
    model = load_model()
    threshold = float(get_threshold())

    probabilities = model.predict_proba(model_input)
    class_labels = list(model.classes_)

    if 1 not in class_labels:
        raise ValueError("The trained model does not contain attack class '1'.")

    attack_index = class_labels.index(1)
    threat_probabilities = probabilities[:, attack_index]
    predicted_attack = threat_probabilities >= threshold
    predicted_labels = predicted_attack.astype(int)

    actual_labels = None
    actual_label_names = None
    if "label" in df.columns:
        actual_label_names = df["label"].astype(str).str.strip()
        actual_labels = (
            actual_label_names.str.lower() != "normal"
        ).astype(int).to_numpy()

    summary = {
        "rows_analyzed": int(len(df)),
        "features_used": 41,
        "has_ground_truth": actual_labels is not None,
        "observed_normal": (
            int((actual_labels == 0).sum())
            if actual_labels is not None else None
        ),
        "observed_attack": (
            int((actual_labels == 1).sum())
            if actual_labels is not None else None
        ),
        "predicted_normal": int((~predicted_attack).sum()),
        "predicted_attack": int(predicted_attack.sum()),
        "attack_rate": (
            float((actual_labels == 1).mean())
            if actual_labels is not None else None
        ),
        "predicted_attack_rate": float(predicted_attack.mean()),
        "average_threat_probability": float(threat_probabilities.mean()),
        "max_threat_probability": float(threat_probabilities.max()),
        "threshold": threshold,
    }

    metrics = None
    confusion = None

    if actual_labels is not None:
        cm = confusion_matrix(actual_labels, predicted_labels, labels=[0, 1])
        confusion = {
            "tn": int(cm[0, 0]),
            "fp": int(cm[0, 1]),
            "fn": int(cm[1, 0]),
            "tp": int(cm[1, 1]),
        }
        metrics = {
            "accuracy": float(accuracy_score(actual_labels, predicted_labels)),
            "precision": float(precision_score(actual_labels, predicted_labels, zero_division=0)),
            "recall": float(recall_score(actual_labels, predicted_labels, zero_division=0)),
            "f1": float(f1_score(actual_labels, predicted_labels, zero_division=0)),
        }

    attack_distribution = []
    if actual_label_names is not None:
        counts = actual_label_names.value_counts().sort_values(ascending=False)
        attack_distribution = [
            {"label": str(label), "count": int(count)}
            for label, count in counts.items()
        ]

    bins = [
        (0.0, 0.1),(0.1,0.2),(0.2,0.3),(0.3,0.4),(0.4,0.5),
        (0.5,0.6),(0.6,0.7),(0.7,0.8),(0.8,0.9),(0.9,1.0),
    ]
    probability_histogram = []
    for lower, upper in bins:
        if upper == 1.0:
            mask = (threat_probabilities >= lower) & (threat_probabilities <= upper)
        else:
            mask = (threat_probabilities >= lower) & (threat_probabilities < upper)
        probability_histogram.append({
            "range": f"{int(lower*100)}–{int(upper*100)}%",
            "count": int(mask.sum()),
        })

    rows = []
    for index in range(min(len(df), 200)):
        row = df.iloc[index]
        rows.append({
            "row": index + 1,
            "protocol_type": str(row["protocol_type"]),
            "service": str(row["service"]),
            "flag": str(row["flag"]),
            "actual_label": str(row["label"]) if "label" in df.columns else None,
            "predicted_label": "attack" if predicted_labels[index] else "normal",
            "threat_probability": float(threat_probabilities[index]),
        })

    return {
        "summary": summary,
        "metrics": metrics,
        "confusion_matrix": confusion,
        "attack_distribution": attack_distribution,
        "probability_histogram": probability_histogram,
        "rows": rows,
        "threat_signal": {
            "value": float(threat_probabilities.max()),
            "basis": "maximum row threat probability",
        },
    }


def _quantum_analysis(
    *,
    n_bits: int,
    trials: int,
    noise_rate: float,
    eve_probability: float,
    include_sweeps: bool,
) -> dict:
    quantum = run_quantum_security(
        n_bits=n_bits,
        trials=trials,
        noise_rate=noise_rate,
        eve_probability=eve_probability,
    )

    quantum["charts"] = {
        "qber_vs_noise": [],
        "qber_vs_eve": [],
    }

    if include_sweeps:
        sweep_trials = max(2, min(5, trials))
        sweep_bits = max(50, min(150, n_bits))

        for noise in [0.0, 0.02, 0.05, 0.10, 0.15]:
            item = run_quantum_security(
                n_bits=sweep_bits,
                trials=sweep_trials,
                noise_rate=noise,
                eve_probability=0.0,
            )
            quantum["charts"]["qber_vs_noise"].append({
                "x": noise,
                "observed_qber": float(item["qber"]),
                "expected_qber": float(item["expected_qber"]),
            })

        for eve in [0.0, 0.25, 0.50, 0.75, 1.0]:
            item = run_quantum_security(
                n_bits=sweep_bits,
                trials=sweep_trials,
                noise_rate=noise_rate,
                eve_probability=eve,
            )
            quantum["charts"]["qber_vs_eve"].append({
                "x": eve,
                "observed_qber": float(item["qber"]),
                "expected_qber": float(item["expected_qber"]),
            })

    return quantum


def analyze_uploaded_dataset(
    file_bytes: bytes | None,
    filename: str | None,
    *,
    analysis_mode: str = "hybrid",
    n_bits: int = 100,
    trials: int = 10,
    noise_rate: float = 0.0,
    eve_probability: float = 0.0,
) -> dict:
    mode = (analysis_mode or "hybrid").strip().lower()

    if mode not in {"classical", "qber", "hybrid"}:
        raise ValueError("analysis_mode must be classical, qber, or hybrid.")

    if mode == "qber":
        quantum = _quantum_analysis(
            n_bits=n_bits,
            trials=trials,
            noise_rate=noise_rate,
            eve_probability=eve_probability,
            include_sweeps=True,
        )
        return {
            "source": "qber_live",
            "analysis_mode": "qber",
            "model": {
                "name": "QBER Model",
                "type": "Bayesian QBER Evidence Model",
            },
            "quantum": quantum,
        }

    if not file_bytes or not filename:
        raise ValueError(
            "A dataset file is required for Classical ML and Hybrid modes."
        )

    df = _load_nsl_dataframe(file_bytes, filename)
    classical = _classical_analysis(df)

    base = {
        "source": "uploaded_dataset",
        "analysis_mode": mode,
        "file": {
            "name": filename,
            "format": (
                filename.lower().rsplit(".", 1)[-1]
                if "." in filename else "txt"
            ),
        },
    }

    if mode == "classical":
        base.update({
            "model": {
                "name": "Classical ML",
                "type": "LightGBM Threat Classifier",
            },
            **classical,
        })
        return base

    quantum = _quantum_analysis(
        n_bits=n_bits,
        trials=trials,
        noise_rate=noise_rate,
        eve_probability=eve_probability,
        include_sweeps=False,
    )

    decision = make_security_decision(
        threat_probability=classical["threat_signal"]["value"],
        qber=quantum["qber"],
        expected_qber=quantum["expected_qber"],
        quantum_attack_probability=quantum["quantum_attack_probability"],
    )

    base.update({
        "model": {
            "name": "Hybrid Model",
            "type": "Q-Safe Fusion Engine",
        },
        **classical,
        "quantum": quantum,
        "decision": decision,
    })
    return base
