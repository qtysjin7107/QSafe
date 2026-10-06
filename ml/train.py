from pathlib import Path

import joblib

from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
)

from ml.preprocess import (
    TRAIN_PATH,
    TEST_PATH,
    load_dataset,
    prepare_features,
    build_preprocessor,
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]

MODEL_DIR = PROJECT_ROOT / "models"
MODEL_PATH = MODEL_DIR / "threat_model.joblib"


def train_model():
    print("Loading NSL-KDD...")

    train_df = load_dataset(TRAIN_PATH)
    test_df = load_dataset(TEST_PATH)

    X_train, y_train = prepare_features(train_df)
    X_test, y_test = prepare_features(test_df)

    print(f"Training samples: {len(X_train)}")
    print(f"Testing samples : {len(X_test)}")

    preprocessor = build_preprocessor()

    classifier = LogisticRegression(
        max_iter=1000,
        random_state=42,
    )

    model = Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", classifier),
    ])

    print("\nTraining model...")

    model.fit(
        X_train,
        y_train
    )

    print("Training complete.")

    y_pred = model.predict(X_test)

    accuracy = accuracy_score(
        y_test,
        y_pred
    )

    precision = precision_score(
        y_test,
        y_pred
    )

    recall = recall_score(
        y_test,
        y_pred
    )

    f1 = f1_score(
        y_test,
        y_pred
    )

    print("\n===== CLASSICAL BASELINE =====")
    print(f"Accuracy : {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall   : {recall:.4f}")
    print(f"F1 Score : {f1:.4f}")

    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    joblib.dump(
        model,
        MODEL_PATH
    )

    print("\nModel saved to:")
    print(MODEL_PATH)

    return model


if __name__ == "__main__":
    train_model()