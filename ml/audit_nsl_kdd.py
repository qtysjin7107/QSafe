from pathlib import Path

import pandas as pd

from ml.preprocess import (
    COLUMNS,
    FEATURE_COLUMNS,
    TRAIN_PATH,
    TEST_PATH,
    load_dataset,
    create_binary_target,
)


def main():
    print("=" * 70)
    print("Q-SAFE NSL-KDD DATA AUDIT")
    print("=" * 70)

    train_df = create_binary_target(
        load_dataset(TRAIN_PATH)
    )

    test_df = create_binary_target(
        load_dataset(TEST_PATH)
    )

    # ---------------------------------------------------------
    # 1. Basic shapes
    # ---------------------------------------------------------

    print("\n1. SHAPES")
    print("-" * 70)

    print("Train:", train_df.shape)
    print("Test :", test_df.shape)

    print(
        "Expected train rows: 125,973"
    )
    print(
        "Expected test rows : 22,544"
    )

    # ---------------------------------------------------------
    # 2. Column check
    # ---------------------------------------------------------

    print("\n2. COLUMN CHECK")
    print("-" * 70)

    print(
        "Train columns:",
        len(train_df.columns)
    )

    print(
        "Test columns :",
        len(test_df.columns)
    )

    print(
        "Columns identical:",
        list(train_df.columns)
        == list(test_df.columns)
    )

    print(
        "Model features:",
        len(FEATURE_COLUMNS)
    )

    print(
        "Label excluded:",
        "label" not in FEATURE_COLUMNS
    )

    print(
        "Difficulty excluded:",
        "difficulty" not in FEATURE_COLUMNS
    )

    # ---------------------------------------------------------
    # 3. Raw labels
    # ---------------------------------------------------------

    print("\n3. RAW LABELS")
    print("-" * 70)

    print("Training labels:")
    print(
        train_df["label"]
        .value_counts()
        .to_string()
    )

    print("\nTesting labels:")
    print(
        test_df["label"]
        .value_counts()
        .to_string()
    )

    # ---------------------------------------------------------
    # 4. Binary distribution
    # ---------------------------------------------------------

    print("\n4. BINARY DISTRIBUTION")
    print("-" * 70)

    print("Training:")
    print(
        train_df["target"]
        .value_counts()
        .rename({
            0: "normal",
            1: "attack",
        })
        .to_string()
    )

    print("\nTesting:")
    print(
        test_df["target"]
        .value_counts()
        .rename({
            0: "normal",
            1: "attack",
        })
        .to_string()
    )

    # ---------------------------------------------------------
    # 5. Missing values
    # ---------------------------------------------------------

    print("\n5. MISSING VALUES")
    print("-" * 70)

    print(
        "Train missing:",
        train_df.isnull().sum().sum()
    )

    print(
        "Test missing:",
        test_df.isnull().sum().sum()
    )

    # ---------------------------------------------------------
    # 6. Duplicate records inside each dataset
    # ---------------------------------------------------------

    print("\n6. DUPLICATE RECORDS")
    print("-" * 70)

    train_duplicates = train_df[
        FEATURE_COLUMNS
    ].duplicated().sum()

    test_duplicates = test_df[
        FEATURE_COLUMNS
    ].duplicated().sum()

    print(
        "Duplicate feature rows in train:",
        train_duplicates
    )

    print(
        "Duplicate feature rows in test :",
        test_duplicates
    )

    print(
        "Train duplicate percentage:",
        f"{train_duplicates / len(train_df) * 100:.2f}%"
    )

    print(
        "Test duplicate percentage:",
        f"{test_duplicates / len(test_df) * 100:.2f}%"
    )

    # ---------------------------------------------------------
    # 7. Train/Test exact feature overlap
    # ---------------------------------------------------------

    print("\n7. TRAIN/TEST FEATURE OVERLAP")
    print("-" * 70)

    train_hash = pd.util.hash_pandas_object(
        train_df[FEATURE_COLUMNS],
        index=False,
    )

    test_hash = pd.util.hash_pandas_object(
        test_df[FEATURE_COLUMNS],
        index=False,
    )

    train_hash_set = set(train_hash)

    overlap_count = sum(
        value in train_hash_set
        for value in test_hash
    )

    print(
        "Exact feature rows appearing in both:",
        overlap_count
    )

    print(
        "Percentage of test rows overlapping:",
        f"{overlap_count / len(test_df) * 100:.2f}%"
    )

    # ---------------------------------------------------------
    # 8. Attack labels only present in test
    # ---------------------------------------------------------

    print("\n8. ATTACK TYPES ONLY IN TEST")
    print("-" * 70)

    train_labels = set(
        train_df["label"].unique()
    )

    test_labels = set(
        test_df["label"].unique()
    )

    test_only_labels = sorted(
        test_labels - train_labels
    )

    if test_only_labels:
        print(
            "Attack labels appearing in TEST "
            "but not TRAIN:"
        )

        for label in test_only_labels:
            print("  -", label)

    else:
        print(
            "No test-only raw labels found."
        )

    # ---------------------------------------------------------
    # 9. Categorical values unseen in train
    # ---------------------------------------------------------

    print("\n9. UNSEEN CATEGORICAL VALUES")
    print("-" * 70)

    categorical = [
        "protocol_type",
        "service",
        "flag",
    ]

    for column in categorical:

        train_values = set(
            train_df[column].unique()
        )

        test_values = set(
            test_df[column].unique()
        )

        unseen = test_values - train_values

        print(
            f"{column}: {len(unseen)} unseen values"
        )

        if unseen:
            print(
                "   ",
                sorted(unseen)
            )

    print("\n" + "=" * 70)
    print("AUDIT COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()