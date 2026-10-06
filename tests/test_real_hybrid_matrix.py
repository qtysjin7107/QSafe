import pandas as pd

from backend.services.hybrid_service import analyze_security


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


DATASET_PATH = "data/raw/KDDTest+.txt"


def load_samples():
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

    return normal_row, attack_row


def row_to_features(row):
    return {
        column: row[column]
        for column in COLUMNS
        if column not in {"label", "difficulty"}
    }


def run_scenario(
    name,
    row,
    noise_rate,
    eve_probability,
):
    features = row_to_features(row)

    result = analyze_security(
        network_features=features,
        n_bits=100,
        noise_rate=noise_rate,
        eve_probability=eve_probability,
    )

    print("\n" + "=" * 70)
    print(name)
    print("=" * 70)

    print("Original NSL-KDD label:")
    print(row["label"])

    print("\nThreat:")
    print(result["threat"])

    print("\nQuantum:")
    print(result["quantum"])

    print("\nDecision:")
    print(result["decision"])


def main():
    normal_row, attack_row = load_samples()

    scenarios = [
        (
            "NORMAL NETWORK + NORMAL QUANTUM",
            normal_row,
            0.0,
            0.0,
        ),
        (
            "NORMAL NETWORK + EAVESDROPPER",
            normal_row,
            0.0,
            0.50,
        ),
        (
            "ATTACK NETWORK + NORMAL QUANTUM",
            attack_row,
            0.0,
            0.0,
        ),
        (
            "ATTACK NETWORK + EAVESDROPPER",
            attack_row,
            0.0,
            0.50,
        ),
        (
            "ATTACK NETWORK + NOISE + EAVESDROPPER",
            attack_row,
            0.05,
            0.50,
        ),
    ]

    for scenario in scenarios:
        run_scenario(*scenario)


if __name__ == "__main__":
    main()