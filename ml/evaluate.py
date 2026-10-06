from pathlib import Path

import joblib
import matplotlib.pyplot as plt

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
    ConfusionMatrixDisplay,
)

from ml.preprocess import (
    TEST_PATH,
    load_dataset,
    prepare_features,
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]

MODEL_PATH = (
    PROJECT_ROOT
    / "models"
    / "threat_model.joblib"
)

FIGURE_DIR = (
    PROJECT_ROOT
    / "experiments"
    / "figures"
)


def evaluate_model():

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            "Model not found. "
            "Run: python -m ml.train"
        )

    model = joblib.load(
        MODEL_PATH
    )

    test_df = load_dataset(
        TEST_PATH
    )

    X_test, y_test = prepare_features(
        test_df
    )

    y_pred = model.predict(
        X_test
    )

    print("===== Q-SAFE THREAT MODEL =====")

    print(
        f"Accuracy : "
        f"{accuracy_score(y_test, y_pred):.4f}"
    )

    print(
        f"Precision: "
        f"{precision_score(y_test, y_pred):.4f}"
    )

    print(
        f"Recall   : "
        f"{recall_score(y_test, y_pred):.4f}"
    )

    print(
        f"F1 Score : "
        f"{f1_score(y_test, y_pred):.4f}"
    )

    print("\nClassification report:\n")

    print(
        classification_report(
            y_test,
            y_pred,
            target_names=[
                "Normal",
                "Attack",
            ],
        )
    )

    cm = confusion_matrix(
        y_test,
        y_pred
    )

    display = ConfusionMatrixDisplay(
        confusion_matrix=cm,
        display_labels=[
            "Normal",
            "Attack",
        ],
    )

    display.plot()

    plt.title(
        "Q-Safe NSL-KDD Threat Classifier"
    )

    FIGURE_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    output_path = (
        FIGURE_DIR
        / "nsl_kdd_confusion_matrix.png"
    )

    plt.savefig(
        output_path,
        dpi=200,
        bbox_inches="tight"
    )

    plt.show()

    print(
        f"\nFigure saved to:\n{output_path}"
    )


if __name__ == "__main__":
    evaluate_model()