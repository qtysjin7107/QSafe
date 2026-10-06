from pathlib import Path

import joblib
import pandas as pd

from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from ml.preprocess import (
    TRAIN_PATH,
    TEST_PATH,
    load_dataset,
    prepare_features,
    build_preprocessor,
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = PROJECT_ROOT / "models"

BEST_MODEL_PATH = MODEL_DIR / "threat_model_best.joblib"
RESULTS_PATH = PROJECT_ROOT / "experiments" / "ml_model_comparison.csv"


def evaluate_model(name, model, X, y):
    y_pred = model.predict(X)

    return {
        "model": name,
        "accuracy": accuracy_score(y, y_pred),
        "precision": precision_score(y, y_pred),
        "recall": recall_score(y, y_pred),
        "f1": f1_score(y, y_pred),
    }


def main():
    print("Loading NSL-KDD...")

    train_df = load_dataset(TRAIN_PATH)
    test_df = load_dataset(TEST_PATH)

    X_full, y_full = prepare_features(train_df)
    X_test, y_test = prepare_features(test_df)

    # ---------------------------------------------------------
    # IMPORTANT:
    # We split ONLY the training dataset.
    # KDDTest+ stays untouched until the final evaluation.
    # ---------------------------------------------------------

    X_train, X_val, y_train, y_val = train_test_split(
        X_full,
        y_full,
        test_size=0.20,
        random_state=42,
        stratify=y_full,
    )

    print(f"Training set   : {X_train.shape}")
    print(f"Validation set : {X_val.shape}")
    print(f"Final test set : {X_test.shape}")

    preprocessor = build_preprocessor()

    models = {
        "RandomForest": RandomForestClassifier(
            n_estimators=300,
            max_features="sqrt",
            class_weight="balanced_subsample",
            random_state=42,
            n_jobs=-1,
        ),

        "ExtraTrees": ExtraTreesClassifier(
            n_estimators=300,
            max_features="sqrt",
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        ),
    }

    validation_results = []

    # ---------------------------------------------------------
    # Train candidate models on TRAIN split only
    # ---------------------------------------------------------

    for name, classifier in models.items():

        print(f"\n===== {name} =====")

        pipeline = Pipeline([
            ("preprocessor", preprocessor),
            ("classifier", classifier),
        ])

        print("Training...")

        pipeline.fit(
            X_train,
            y_train,
        )

        result = evaluate_model(
            name,
            pipeline,
            X_val,
            y_val,
        )

        validation_results.append(result)

        print(f"Validation Accuracy : {result['accuracy']:.4f}")
        print(f"Validation Precision: {result['precision']:.4f}")
        print(f"Validation Recall   : {result['recall']:.4f}")
        print(f"Validation F1       : {result['f1']:.4f}")

    results_df = pd.DataFrame(validation_results)

    print("\n===== VALIDATION COMPARISON =====")
    print(results_df.to_string(index=False))

    # ---------------------------------------------------------
    # Choose the best model using validation F1
    # ---------------------------------------------------------

    best_row = results_df.sort_values(
        by="f1",
        ascending=False,
    ).iloc[0]

    best_name = best_row["model"]

    print(f"\nSelected model: {best_name}")

    # ---------------------------------------------------------
    # Retrain selected model on ALL KDDTrain+
    # ---------------------------------------------------------

    best_classifier = models[best_name]

    final_model = Pipeline([
        ("preprocessor", build_preprocessor()),
        ("classifier", best_classifier),
    ])

    print("\nRetraining selected model on full KDDTrain+...")

    final_model.fit(
        X_full,
        y_full,
    )

    print("Final training complete.")

    # ---------------------------------------------------------
    # FINAL EVALUATION ON KDDTest+
    # ---------------------------------------------------------

    y_test_pred = final_model.predict(X_test)

    final_accuracy = accuracy_score(
        y_test,
        y_test_pred,
    )

    final_precision = precision_score(
        y_test,
        y_test_pred,
    )

    final_recall = recall_score(
        y_test,
        y_test_pred,
    )

    final_f1 = f1_score(
        y_test,
        y_test_pred,
    )

    print("\n===== FINAL TEST RESULTS =====")
    print(f"Model    : {best_name}")
    print(f"Accuracy : {final_accuracy:.4f}")
    print(f"Precision: {final_precision:.4f}")
    print(f"Recall   : {final_recall:.4f}")
    print(f"F1 Score : {final_f1:.4f}")

    # ---------------------------------------------------------
    # Save model
    # ---------------------------------------------------------

    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    joblib.dump(
        final_model,
        BEST_MODEL_PATH,
    )

    print(
        f"\nBest model saved to:\n"
        f"{BEST_MODEL_PATH}"
    )

    # Save validation comparison
    RESULTS_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    results_df.to_csv(
        RESULTS_PATH,
        index=False,
    )

    print(
        f"Validation comparison saved to:\n"
        f"{RESULTS_PATH}"
    )


if __name__ == "__main__":
    main()