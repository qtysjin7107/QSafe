from pathlib import Path
import time

import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import (
    RandomForestClassifier,
    ExtraTreesClassifier,
    HistGradientBoostingClassifier,
)
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer

from ml.preprocess import (
    TRAIN_PATH,
    TEST_PATH,
    load_dataset,
    prepare_features,
    CATEGORICAL_FEATURES,
    NUMERICAL_FEATURES,
    build_preprocessor,
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]

MODEL_DIR = PROJECT_ROOT / "models"
RESULTS_DIR = PROJECT_ROOT / "experiments"

BEST_MODEL_PATH = MODEL_DIR / "threat_model_best.joblib"
VALIDATION_RESULTS_PATH = RESULTS_DIR / "model_validation_comparison.csv"
FINAL_RESULTS_PATH = RESULTS_DIR / "model_final_test_result.csv"


# ------------------------------------------------------------
# Optional external models
# ------------------------------------------------------------

try:
    from catboost import CatBoostClassifier
    CATBOOST_AVAILABLE = True
except ImportError:
    CATBOOST_AVAILABLE = False


try:
    from xgboost import XGBClassifier
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False


try:
    from lightgbm import LGBMClassifier
    LIGHTGBM_AVAILABLE = True
except ImportError:
    LIGHTGBM_AVAILABLE = False


# ------------------------------------------------------------
# Model evaluation
# ------------------------------------------------------------

def evaluate_model(
    name,
    model,
    X,
    y,
    use_catboost=False,
):
    start_time = time.time()

    model.fit(X, y)

    training_time = time.time() - start_time

    predictions = model.predict(X)

    probabilities = model.predict_proba(X)[:, 1]

    result = {
        "model": name,
        "accuracy": accuracy_score(y, predictions),
        "precision": precision_score(
            y,
            predictions,
            zero_division=0,
        ),
        "recall": recall_score(
            y,
            predictions,
            zero_division=0,
        ),
        "f1": f1_score(
            y,
            predictions,
            zero_division=0,
        ),
        "roc_auc": roc_auc_score(
            y,
            probabilities,
        ),
        "pr_auc": average_precision_score(
            y,
            probabilities,
        ),
        "training_time_seconds": training_time,
    }

    return model, result


# ------------------------------------------------------------
# Build common preprocessing
# ------------------------------------------------------------

def build_sparse_preprocessor():
    """
    Used by Logistic Regression, Random Forest,
    Extra Trees, XGBoost and LightGBM.
    """

    return ColumnTransformer(
        transformers=[
            (
                "categorical",
                OneHotEncoder(
                    handle_unknown="ignore",
                    sparse_output=True,
                ),
                CATEGORICAL_FEATURES,
            ),
            (
                "numerical",
                "passthrough",
                NUMERICAL_FEATURES,
            ),
        ]
    )


def build_dense_preprocessor():
    """
    HistGradientBoosting requires dense input.
    """

    return ColumnTransformer(
        transformers=[
            (
                "categorical",
                OneHotEncoder(
                    handle_unknown="ignore",
                    sparse_output=False,
                    dtype=np.float32,
                ),
                CATEGORICAL_FEATURES,
            ),
            (
                "numerical",
                "passthrough",
                NUMERICAL_FEATURES,
            ),
        ]
    )


# ------------------------------------------------------------
# Main benchmark
# ------------------------------------------------------------

def main():

    print("=" * 70)
    print("Q-SAFE CLASSICAL MODEL BENCHMARK")
    print("=" * 70)

    print("\nLoading NSL-KDD...")

    train_df = load_dataset(TRAIN_PATH)
    test_df = load_dataset(TEST_PATH)

    X_full, y_full = prepare_features(
        train_df
    )

    X_test, y_test = prepare_features(
        test_df
    )

    # --------------------------------------------------------
    # IMPORTANT:
    # KDDTest+ remains untouched.
    #
    # We use ONLY KDDTrain+ for model selection.
    # --------------------------------------------------------

    X_train, X_val, y_train, y_val = train_test_split(
        X_full,
        y_full,
        test_size=0.20,
        random_state=42,
        stratify=y_full,
    )

    print("\nDataset sizes:")
    print(f"Training   : {len(X_train):,}")
    print(f"Validation : {len(X_val):,}")
    print(f"Final test : {len(X_test):,}")

    negative_count = (y_train == 0).sum()
    positive_count = (y_train == 1).sum()

    scale_pos_weight = (
        negative_count / positive_count
    )

    print(
        f"\nAttack class weight ratio: "
        f"{scale_pos_weight:.3f}"
    )

    results = []

    # ========================================================
    # 1. LOGISTIC REGRESSION
    # ========================================================

    print("\n" + "=" * 70)
    print("1. LOGISTIC REGRESSION")
    print("=" * 70)

    logistic_pipeline = Pipeline([
        (
            "preprocessor",
            build_preprocessor(),
        ),
        (
            "classifier",
            LogisticRegression(
                max_iter=1000,
                random_state=42,
            ),
        ),
    ])

    logistic_pipeline, result = evaluate_model(
        "LogisticRegression",
        logistic_pipeline,
        X_train,
        y_train,
    )

    val_predictions = logistic_pipeline.predict(X_val)
    val_probabilities = logistic_pipeline.predict_proba(X_val)[:, 1]

    result = {
        "model": "LogisticRegression",
        "accuracy": accuracy_score(
            y_val,
            val_predictions,
        ),
        "precision": precision_score(
            y_val,
            val_predictions,
            zero_division=0,
        ),
        "recall": recall_score(
            y_val,
            val_predictions,
            zero_division=0,
        ),
        "f1": f1_score(
            y_val,
            val_predictions,
            zero_division=0,
        ),
        "roc_auc": roc_auc_score(
            y_val,
            val_probabilities,
        ),
        "pr_auc": average_precision_score(
            y_val,
            val_probabilities,
        ),
    }

    results.append(result)

    print(result)


    # ========================================================
    # 2. RANDOM FOREST
    # ========================================================

    print("\n" + "=" * 70)
    print("2. RANDOM FOREST")
    print("=" * 70)

    rf_pipeline = Pipeline([
        (
            "preprocessor",
            build_sparse_preprocessor(),
        ),
        (
            "classifier",
            RandomForestClassifier(
                n_estimators=300,
                max_features="sqrt",
                class_weight="balanced_subsample",
                random_state=42,
                n_jobs=-1,
            ),
        ),
    ])

    rf_pipeline, _ = evaluate_model(
        "RandomForest",
        rf_pipeline,
        X_train,
        y_train,
    )

    val_predictions = rf_pipeline.predict(X_val)
    val_probabilities = rf_pipeline.predict_proba(X_val)[:, 1]

    result = {
        "model": "RandomForest",
        "accuracy": accuracy_score(
            y_val,
            val_predictions,
        ),
        "precision": precision_score(
            y_val,
            val_predictions,
            zero_division=0,
        ),
        "recall": recall_score(
            y_val,
            val_predictions,
            zero_division=0,
        ),
        "f1": f1_score(
            y_val,
            val_predictions,
            zero_division=0,
        ),
        "roc_auc": roc_auc_score(
            y_val,
            val_probabilities,
        ),
        "pr_auc": average_precision_score(
            y_val,
            val_probabilities,
        ),
    }

    results.append(result)

    print(result)


    # ========================================================
    # 3. EXTRA TREES
    # ========================================================

    print("\n" + "=" * 70)
    print("3. EXTRA TREES")
    print("=" * 70)

    extra_pipeline = Pipeline([
        (
            "preprocessor",
            build_sparse_preprocessor(),
        ),
        (
            "classifier",
            ExtraTreesClassifier(
                n_estimators=300,
                max_features="sqrt",
                class_weight="balanced",
                random_state=42,
                n_jobs=-1,
            ),
        ),
    ])

    extra_pipeline, _ = evaluate_model(
        "ExtraTrees",
        extra_pipeline,
        X_train,
        y_train,
    )

    val_predictions = extra_pipeline.predict(X_val)
    val_probabilities = extra_pipeline.predict_proba(X_val)[:, 1]

    result = {
        "model": "ExtraTrees",
        "accuracy": accuracy_score(
            y_val,
            val_predictions,
        ),
        "precision": precision_score(
            y_val,
            val_predictions,
            zero_division=0,
        ),
        "recall": recall_score(
            y_val,
            val_predictions,
            zero_division=0,
        ),
        "f1": f1_score(
            y_val,
            val_predictions,
            zero_division=0,
        ),
        "roc_auc": roc_auc_score(
            y_val,
            val_probabilities,
        ),
        "pr_auc": average_precision_score(
            y_val,
            val_probabilities,
        ),
    }

    results.append(result)

    print(result)


    # ========================================================
    # 4. HISTOGRAM GRADIENT BOOSTING
    # ========================================================

    print("\n" + "=" * 70)
    print("4. HISTOGRAM GRADIENT BOOSTING")
    print("=" * 70)

    hist_pipeline = Pipeline([
        (
            "preprocessor",
            build_dense_preprocessor(),
        ),
        (
            "classifier",
            HistGradientBoostingClassifier(
                max_iter=300,
                learning_rate=0.08,
                max_leaf_nodes=63,
                l2_regularization=1.0,
                random_state=42,
            ),
        ),
    ])

    hist_pipeline, _ = evaluate_model(
        "HistGradientBoosting",
        hist_pipeline,
        X_train,
        y_train,
    )

    val_predictions = hist_pipeline.predict(X_val)
    val_probabilities = hist_pipeline.predict_proba(X_val)[:, 1]

    result = {
        "model": "HistGradientBoosting",
        "accuracy": accuracy_score(
            y_val,
            val_predictions,
        ),
        "precision": precision_score(
            y_val,
            val_predictions,
            zero_division=0,
        ),
        "recall": recall_score(
            y_val,
            val_predictions,
            zero_division=0,
        ),
        "f1": f1_score(
            y_val,
            val_predictions,
            zero_division=0,
        ),
        "roc_auc": roc_auc_score(
            y_val,
            val_probabilities,
        ),
        "pr_auc": average_precision_score(
            y_val,
            val_probabilities,
        ),
    }

    results.append(result)

    print(result)


    # ========================================================
    # 5. CATBOOST
    # ========================================================

    if CATBOOST_AVAILABLE:

        print("\n" + "=" * 70)
        print("5. CATBOOST")
        print("=" * 70)

        catboost_model = CatBoostClassifier(
            iterations=500,
            depth=8,
            learning_rate=0.08,
            loss_function="Logloss",
            eval_metric="F1",
            thread_count=20,
            random_seed=42,
            verbose=False,
            allow_writing_files=False,
            scale_pos_weight=scale_pos_weight,
            cat_features=CATEGORICAL_FEATURES,
        )

        catboost_model.fit(
            X_train,
            y_train,
            eval_set=(X_val, y_val),
            verbose=False,
        )

        val_predictions = catboost_model.predict(
            X_val
        ).astype(int).ravel()

        val_probabilities = (
            catboost_model
            .predict_proba(X_val)[:, 1]
        )

        result = {
            "model": "CatBoost",
            "accuracy": accuracy_score(
                y_val,
                val_predictions,
            ),
            "precision": precision_score(
                y_val,
                val_predictions,
                zero_division=0,
            ),
            "recall": recall_score(
                y_val,
                val_predictions,
                zero_division=0,
            ),
            "f1": f1_score(
                y_val,
                val_predictions,
                zero_division=0,
            ),
            "roc_auc": roc_auc_score(
                y_val,
                val_probabilities,
            ),
            "pr_auc": average_precision_score(
                y_val,
                val_probabilities,
            ),
        }

        results.append(result)

        print(result)

    else:

        print(
            "\nCatBoost not installed. "
            "Run: pip install catboost"
        )


    # ========================================================
    # 6. XGBOOST
    # ========================================================

    if XGBOOST_AVAILABLE:

        print("\n" + "=" * 70)
        print("6. XGBOOST")
        print("=" * 70)

        xgb_model = Pipeline([
            (
                "preprocessor",
                build_sparse_preprocessor(),
            ),
            (
                "classifier",
                XGBClassifier(
                    n_estimators=500,
                    max_depth=8,
                    learning_rate=0.08,
                    subsample=0.9,
                    colsample_bytree=0.9,
                    objective="binary:logistic",
                    eval_metric="logloss",
                    random_state=42,
                    n_jobs=20,
                    tree_method="hist",
                    scale_pos_weight=scale_pos_weight,
                ),
            ),
        ])

        xgb_model, _ = evaluate_model(
            "XGBoost",
            xgb_model,
            X_train,
            y_train,
        )

        val_predictions = xgb_model.predict(
            X_val
        )

        val_probabilities = (
            xgb_model
            .predict_proba(X_val)[:, 1]
        )

        result = {
            "model": "XGBoost",
            "accuracy": accuracy_score(
                y_val,
                val_predictions,
            ),
            "precision": precision_score(
                y_val,
                val_predictions,
                zero_division=0,
            ),
            "recall": recall_score(
                y_val,
                val_predictions,
                zero_division=0,
            ),
            "f1": f1_score(
                y_val,
                val_predictions,
                zero_division=0,
            ),
            "roc_auc": roc_auc_score(
                y_val,
                val_probabilities,
            ),
            "pr_auc": average_precision_score(
                y_val,
                val_probabilities,
            ),
        }

        results.append(result)

        print(result)

    else:

        print(
            "\nXGBoost not installed. "
            "Run: pip install xgboost"
        )


    # ========================================================
    # 7. LIGHTGBM
    # ========================================================

    if LIGHTGBM_AVAILABLE:

        print("\n" + "=" * 70)
        print("7. LIGHTGBM")
        print("=" * 70)

        lgbm_model = Pipeline([
            (
                "preprocessor",
                build_sparse_preprocessor(),
            ),
            (
                "classifier",
                LGBMClassifier(
                    n_estimators=500,
                    learning_rate=0.05,
                    num_leaves=63,
                    max_depth=-1,
                    subsample=0.9,
                    colsample_bytree=0.9,
                    objective="binary",
                    random_state=42,
                    n_jobs=20,
                    verbosity=-1,
                    scale_pos_weight=scale_pos_weight,
                ),
            ),
        ])

        lgbm_model, _ = evaluate_model(
            "LightGBM",
            lgbm_model,
            X_train,
            y_train,
        )

        val_predictions = lgbm_model.predict(
            X_val
        )

        val_probabilities = (
            lgbm_model
            .predict_proba(X_val)[:, 1]
        )

        result = {
            "model": "LightGBM",
            "accuracy": accuracy_score(
                y_val,
                val_predictions,
            ),
            "precision": precision_score(
                y_val,
                val_predictions,
                zero_division=0,
            ),
            "recall": recall_score(
                y_val,
                val_predictions,
                zero_division=0,
            ),
            "f1": f1_score(
                y_val,
                val_predictions,
                zero_division=0,
            ),
            "roc_auc": roc_auc_score(
                y_val,
                val_probabilities,
            ),
            "pr_auc": average_precision_score(
                y_val,
                val_probabilities,
            ),
        }

        results.append(result)

        print(result)

    else:

        print(
            "\nLightGBM not installed. "
            "Run: pip install lightgbm"
        )


    # ========================================================
    # SAVE VALIDATION RESULTS
    # ========================================================

    results_df = pd.DataFrame(results)

    results_df = results_df.sort_values(
        by=["f1", "recall", "pr_auc"],
        ascending=False,
    )

    print("\n")
    print("=" * 70)
    print("FINAL VALIDATION COMPARISON")
    print("=" * 70)

    print(
        results_df.to_string(
            index=False,
            float_format=lambda x: f"{x:.4f}",
        )
    )

    RESULTS_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    results_df.to_csv(
        VALIDATION_RESULTS_PATH,
        index=False,
    )

    # ========================================================
    # IMPORTANT:
    # Pick the best model using VALIDATION F1.
    # KDDTest+ remains untouched.
    # ========================================================

    best_name = results_df.iloc[0]["model"]

    print(
        f"\nSelected model based on validation: "
        f"{best_name}"
    )

    # ========================================================
    # REBUILD BEST MODEL
    # ========================================================

    print("\nRetraining selected model on ALL KDDTrain+...")

    if best_name == "LogisticRegression":

        best_model = Pipeline([
            (
                "preprocessor",
                build_preprocessor(),
            ),
            (
                "classifier",
                LogisticRegression(
                    max_iter=1000,
                    random_state=42,
                ),
            ),
        ])

        best_model.fit(
            X_full,
            y_full,
        )

    elif best_name == "RandomForest":

        best_model = Pipeline([
            (
                "preprocessor",
                build_sparse_preprocessor(),
            ),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=300,
                    max_features="sqrt",
                    class_weight="balanced_subsample",
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ])

        best_model.fit(
            X_full,
            y_full,
        )

    elif best_name == "ExtraTrees":

        best_model = Pipeline([
            (
                "preprocessor",
                build_sparse_preprocessor(),
            ),
            (
                "classifier",
                ExtraTreesClassifier(
                    n_estimators=300,
                    max_features="sqrt",
                    class_weight="balanced",
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ])

        best_model.fit(
            X_full,
            y_full,
        )

    elif best_name == "HistGradientBoosting":

        best_model = Pipeline([
            (
                "preprocessor",
                build_dense_preprocessor(),
            ),
            (
                "classifier",
                HistGradientBoostingClassifier(
                    max_iter=300,
                    learning_rate=0.08,
                    max_leaf_nodes=63,
                    l2_regularization=1.0,
                    random_state=42,
                ),
            ),
        ])

        best_model.fit(
            X_full,
            y_full,
        )

    elif best_name == "CatBoost":

        best_model = CatBoostClassifier(
            iterations=500,
            depth=8,
            learning_rate=0.08,
            loss_function="Logloss",
            thread_count=20,
            random_seed=42,
            verbose=False,
            allow_writing_files=False,
            scale_pos_weight=scale_pos_weight,
            cat_features=CATEGORICAL_FEATURES,
        )

        best_model.fit(
            X_full,
            y_full,
            verbose=False,
        )

    elif best_name == "XGBoost":

        best_model = Pipeline([
            (
                "preprocessor",
                build_sparse_preprocessor(),
            ),
            (
                "classifier",
                XGBClassifier(
                    n_estimators=500,
                    max_depth=8,
                    learning_rate=0.08,
                    subsample=0.9,
                    colsample_bytree=0.9,
                    objective="binary:logistic",
                    eval_metric="logloss",
                    random_state=42,
                    n_jobs=20,
                    tree_method="hist",
                    scale_pos_weight=scale_pos_weight,
                ),
            ),
        ])

        best_model.fit(
            X_full,
            y_full,
        )

    elif best_name == "LightGBM":

        best_model = Pipeline([
            (
                "preprocessor",
                build_sparse_preprocessor(),
            ),
            (
                "classifier",
                LGBMClassifier(
                    n_estimators=500,
                    learning_rate=0.05,
                    num_leaves=63,
                    max_depth=-1,
                    subsample=0.9,
                    colsample_bytree=0.9,
                    objective="binary",
                    random_state=42,
                    n_jobs=20,
                    verbosity=-1,
                    scale_pos_weight=scale_pos_weight,
                ),
            ),
        ])

        best_model.fit(
            X_full,
            y_full,
        )

    else:
        raise RuntimeError(
            f"Unknown model: {best_name}"
        )

    # ========================================================
    # FINAL TEST
    # ========================================================

    print("\n")
    print("=" * 70)
    print("FINAL KDDTest+ RESULT")
    print("=" * 70)

    if best_name == "CatBoost":

        test_predictions = (
            best_model.predict(X_test)
            .astype(int)
            .ravel()
        )

        test_probabilities = (
            best_model
            .predict_proba(X_test)[:, 1]
        )

    else:

        test_predictions = best_model.predict(
            X_test
        )

        test_probabilities = (
            best_model
            .predict_proba(X_test)[:, 1]
        )

    final_accuracy = accuracy_score(
        y_test,
        test_predictions,
    )

    final_precision = precision_score(
        y_test,
        test_predictions,
        zero_division=0,
    )

    final_recall = recall_score(
        y_test,
        test_predictions,
        zero_division=0,
    )

    final_f1 = f1_score(
        y_test,
        test_predictions,
        zero_division=0,
    )

    final_roc_auc = roc_auc_score(
        y_test,
        test_probabilities,
    )

    final_pr_auc = average_precision_score(
        y_test,
        test_probabilities,
    )

    print(f"Model    : {best_name}")
    print(f"Accuracy : {final_accuracy:.4f}")
    print(f"Precision: {final_precision:.4f}")
    print(f"Recall   : {final_recall:.4f}")
    print(f"F1 Score : {final_f1:.4f}")
    print(f"ROC-AUC  : {final_roc_auc:.4f}")
    print(f"PR-AUC   : {final_pr_auc:.4f}")

    # ========================================================
    # SAVE BEST MODEL
    # ========================================================

    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    joblib.dump(
        best_model,
        BEST_MODEL_PATH,
    )

    print(
        f"\nBest model saved to:\n"
        f"{BEST_MODEL_PATH}"
    )

    final_result = pd.DataFrame([
        {
            "model": best_name,
            "accuracy": final_accuracy,
            "precision": final_precision,
            "recall": final_recall,
            "f1": final_f1,
            "roc_auc": final_roc_auc,
            "pr_auc": final_pr_auc,
        }
    ])

    final_result.to_csv(
        FINAL_RESULTS_PATH,
        index=False,
    )

    print(
        f"Final test result saved to:\n"
        f"{FINAL_RESULTS_PATH}"
    )


if __name__ == "__main__":
    main()