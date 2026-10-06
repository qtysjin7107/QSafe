from pathlib import Path

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data" / "raw"

TRAIN_PATH = DATA_DIR / "KDDTrain+.txt"
TEST_PATH = DATA_DIR / "KDDTest+.txt"


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


CATEGORICAL_FEATURES = [
    "protocol_type",
    "service",
    "flag",
]

FEATURE_COLUMNS = [
    column
    for column in COLUMNS
    if column not in ["label", "difficulty"]
]

NUMERICAL_FEATURES = [
    column
    for column in FEATURE_COLUMNS
    if column not in CATEGORICAL_FEATURES
]


def load_dataset(path: Path) -> pd.DataFrame:
    """Load an NSL-KDD text file."""

    if not path.exists():
        raise FileNotFoundError(
            f"Dataset not found: {path}"
        )

    return pd.read_csv(
        path,
        names=COLUMNS
    )


def create_binary_target(df: pd.DataFrame) -> pd.DataFrame:
    """Convert NSL-KDD labels to normal=0, attack=1."""

    result = df.copy()

    result["target"] = (
        result["label"]
        .astype(str)
        .str.strip()
        .str.lower()
        .ne("normal")
        .astype(int)
    )

    return result


def prepare_features(
    df: pd.DataFrame
) -> tuple[pd.DataFrame, pd.Series]:

    df = create_binary_target(df)

    X = df[FEATURE_COLUMNS].copy()
    y = df["target"].copy()

    return X, y


def build_preprocessor() -> ColumnTransformer:
    """Create the preprocessing pipeline."""

    return ColumnTransformer(
        transformers=[
            (
                "categorical",
                OneHotEncoder(
                    handle_unknown="ignore"
                ),
                CATEGORICAL_FEATURES,
            ),
            (
                "numerical",
                StandardScaler(),
                NUMERICAL_FEATURES,
            ),
        ]
    )