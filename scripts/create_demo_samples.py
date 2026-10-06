import json
from pathlib import Path

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]

DATASET_PATH = (
    PROJECT_ROOT
    / "data"
    / "raw"
    / "KDDTest+.txt"
)

OUTPUT_PATH = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "demo_samples.json"
)

COLUMNS = [
    "duration",
    "protocol_type",
    "service",
    "flag",
    "src_bytes",
    "dst_bytes",
    "land",
    "wrong_fragment",
    "urgent",
    "hot",
    "num_failed_logins",
    "logged_in",
    "num_compromised",
    "root_shell",
    "su_attempted",
    "num_root",
    "num_file_creations",
    "num_shells",
    "num_access_files",
    "num_outbound_cmds",
    "is_host_login",
    "is_guest_login",
    "count",
    "srv_count",
    "serror_rate",
    "srv_serror_rate",
    "rerror_rate",
    "srv_rerror_rate",
    "same_srv_rate",
    "diff_srv_rate",
    "srv_diff_host_rate",
    "dst_host_count",
    "dst_host_srv_count",
    "dst_host_same_srv_rate",
    "dst_host_diff_srv_rate",
    "dst_host_same_src_port_rate",
    "dst_host_srv_diff_host_rate",
    "dst_host_serror_rate",
    "dst_host_srv_serror_rate",
    "dst_host_rerror_rate",
    "dst_host_srv_rerror_rate",
    "label",
    "difficulty",
]


def row_to_features(row):
    features = {}

    for column in COLUMNS:
        if column in {"label", "difficulty"}:
            continue

        value = row[column]

        if hasattr(value, "item"):
            value = value.item()

        features[column] = value

    return features


def main():
    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATASET_PATH}"
        )

    df = pd.read_csv(
        DATASET_PATH,
        header=None,
        names=COLUMNS,
    )

    normal_row = df[
        df["label"] == "normal"
    ].iloc[0]

    attack_row = df[
        df["label"] != "normal"
    ].iloc[0]

    samples = {
        "normal": {
            "label": str(normal_row["label"]),
            "features": row_to_features(normal_row),
        },
        "attack": {
            "label": str(attack_row["label"]),
            "features": row_to_features(attack_row),
        },
    }

    OUTPUT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with open(
        OUTPUT_PATH,
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            samples,
            file,
            indent=2,
        )

    print(
        f"Created demo samples: {OUTPUT_PATH}"
    )

    print(
        f"Normal sample: {normal_row['label']}"
    )

    print(
        f"Attack sample: {attack_row['label']}"
    )


if __name__ == "__main__":
    main()