# ============================================================
# Q-SAFE
# Hyperparameter Search for Classical Threat Detection
#
# Candidates:
#   1. LightGBM
#   2. CatBoost
#
# Strategy:
#   KDDTrain+ -> train / validation
#   Hyperparameter search -> validation
#   Threshold optimization -> validation
#   Best model -> retrain on ALL KDDTrain+
#   Final evaluation -> untouched KDDTest+
# ============================================================

from pathlib import Path
import json
import time

import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split, RandomizedSearchCV
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    classification_report,
    confusion_matrix,
    ConfusionMatrixDisplay,
)
import matplotlib.pyplot as plt

from ml.preprocess import (
    TRAIN_PATH,
    TEST_PATH,
    load_dataset,
    prepare_features,
    CATEGORICAL_FEATURES,
    NUMERICAL_FEATURES,
)


# ============================================================
# External ML libraries
# ============================================================

try:
    from lightgbm import LGBMClassifier
except ImportError as exc:
    raise ImportError(
        "LightGBM is not installed.\n"
        "Run: python -m pip install lightgbm"
    ) from exc


try:
    from catboost import CatBoostClassifier
except ImportError as exc:
    raise ImportError(
        "CatBoost is not installed.\n"
        "Run: python -m pip install catboost"
    ) from exc


# ============================================================
# Paths
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[1]

MODEL_DIR = PROJECT_ROOT / "models"
RESULTS_DIR = PROJECT_ROOT / "experiments"

BEST_MODEL_PATH = (
    MODEL_DIR / "threat_model_best.joblib"
)

BEST_MODEL_INFO_PATH = (
    MODEL_DIR / "threat_model_info.json"
)

VALIDATION_RESULTS_PATH = (
    RESULTS_DIR / "hyperparameter_validation_results.csv"
)

THRESHOLD_RESULTS_PATH = (
    RESULTS_DIR / "threshold_results.csv"
)

FINAL_RESULTS_PATH = (
    RESULTS_DIR / "final_test_results.csv"
)

CONFUSION_MATRIX_PATH = (
    RESULTS_DIR / "figures" / "final_confusion_matrix.png"
)


# ============================================================
# Configuration
# ============================================================

RANDOM_STATE = 42

# Your CPU has 20 logical processors.
# Keep a few free so Windows/VS Code remain responsive.
CPU_THREADS = 18

# Search size.
# Increase later only if absolutely necessary.
N_ITER_SEARCH = 20

# CV folds used during hyperparameter search.
CV_FOLDS = 3


# ============================================================
# Utility functions
# ============================================================

def calculate_metrics(
    y_true,
    probabilities,
    threshold=0.5,
):
    """
    Convert probabilities into predictions and calculate
    classification metrics.
    """

    predictions = (
        probabilities >= threshold
    ).astype(int)

    return {
        "threshold": float(threshold),

        "accuracy": float(
            accuracy_score(
                y_true,
                predictions,
            )
        ),

        "precision": float(
            precision_score(
                y_true,
                predictions,
                zero_division=0,
            )
        ),

        "recall": float(
            recall_score(
                y_true,
                predictions,
                zero_division=0,
            )
        ),

        "f1": float(
            f1_score(
                y_true,
                predictions,
                zero_division=0,
            )
        ),

        "roc_auc": float(
            roc_auc_score(
                y_true,
                probabilities,
            )
        ),

        "pr_auc": float(
            average_precision_score(
                y_true,
                probabilities,
            )
        ),
    }


# ============================================================
# Threshold optimization
# ============================================================

def find_best_threshold(
    y_true,
    probabilities,
):
    """
    Search thresholds from 0.10 to 0.90.

    Primary objective:
        maximize F1

    Tie-break:
        maximize recall
    """

    threshold_records = []

    for threshold in np.arange(
        0.10,
        0.901,
        0.01,
    ):

        metrics = calculate_metrics(
            y_true,
            probabilities,
            threshold=float(threshold),
        )

        threshold_records.append(
            metrics
        )

    threshold_df = pd.DataFrame(
        threshold_records
    )

    threshold_df = threshold_df.sort_values(
        by=["f1", "recall", "precision"],
        ascending=False,
    )

    best = threshold_df.iloc[0].to_dict()

    return (
        float(best["threshold"]),
        threshold_df,
    )


# ============================================================
# LIGHTGBM
# ============================================================

def run_lightgbm_search(
    X_train,
    y_train,
    X_validation,
    y_validation,
):
    """
    Hyperparameter search for LightGBM.

    LightGBM can consume pandas categorical columns when
    properly marked as categorical.
    """

    print("\n" + "=" * 75)
    print("LIGHTGBM HYPERPARAMETER SEARCH")
    print("=" * 75)

    X_train_lgb = X_train.copy()
    X_validation_lgb = X_validation.copy()

    for column in CATEGORICAL_FEATURES:

        X_train_lgb[column] = (
            X_train_lgb[column]
            .astype("category")
        )

        X_validation_lgb[column] = (
            X_validation_lgb[column]
            .astype(
                pd.api.types.CategoricalDtype(
                    categories=X_train_lgb[column]
                    .cat.categories
                )
            )
        )

    model = LGBMClassifier(
        objective="binary",
        random_state=RANDOM_STATE,
        n_jobs=CPU_THREADS,
        verbosity=-1,
    )

    parameter_space = {
        "n_estimators": [
            300,
            500,
            800,
            1200,
        ],

        "learning_rate": [
            0.02,
            0.03,
            0.05,
            0.08,
            0.10,
        ],

        "num_leaves": [
            31,
            63,
            127,
            255,
        ],

        "max_depth": [
            -1,
            10,
            15,
            20,
        ],

        "min_child_samples": [
            10,
            20,
            40,
            80,
        ],

        "subsample": [
            0.7,
            0.8,
            0.9,
            1.0,
        ],

        "colsample_bytree": [
            0.7,
            0.8,
            0.9,
            1.0,
        ],

        "reg_alpha": [
            0.0,
            0.01,
            0.1,
            1.0,
        ],

        "reg_lambda": [
            0.0,
            0.01,
            0.1,
            1.0,
        ],
    }

    search = RandomizedSearchCV(
        estimator=model,
        param_distributions=parameter_space,
        n_iter=N_ITER_SEARCH,
        scoring="average_precision",
        cv=CV_FOLDS,
        random_state=RANDOM_STATE,
        n_jobs=1,
        verbose=1,
        return_train_score=False,
    )

    start = time.time()

    search.fit(
        X_train_lgb,
        y_train,
        categorical_feature=CATEGORICAL_FEATURES,
    )

    elapsed = time.time() - start

    print(
        f"\nLightGBM search finished in "
        f"{elapsed / 60:.2f} minutes."
    )

    print("\nBest LightGBM parameters:")

    for key, value in search.best_params_.items():
        print(f"{key}: {value}")

    print(
        "\nBest cross-validation PR-AUC:",
        f"{search.best_score_:.6f}",
    )

    best_model = search.best_estimator_

    validation_probabilities = (
        best_model
        .predict_proba(
            X_validation_lgb
        )[:, 1]
    )

    best_threshold, threshold_df = (
        find_best_threshold(
            y_validation,
            validation_probabilities,
        )
    )

    validation_metrics = calculate_metrics(
        y_validation,
        validation_probabilities,
        best_threshold,
    )

    validation_metrics["model"] = "LightGBM"

    print("\nLightGBM validation result:")
    print(
        f"Threshold : "
        f"{best_threshold:.2f}"
    )

    print(
        f"Accuracy  : "
        f"{validation_metrics['accuracy']:.4f}"
    )

    print(
        f"Precision : "
        f"{validation_metrics['precision']:.4f}"
    )

    print(
        f"Recall    : "
        f"{validation_metrics['recall']:.4f}"
    )

    print(
        f"F1        : "
        f"{validation_metrics['f1']:.4f}"
    )

    print(
        f"ROC-AUC   : "
        f"{validation_metrics['roc_auc']:.4f}"
    )

    print(
        f"PR-AUC    : "
        f"{validation_metrics['pr_auc']:.4f}"
    )

    return {
        "model": best_model,
        "threshold": best_threshold,
        "metrics": validation_metrics,
        "threshold_df": threshold_df,
        "best_params": search.best_params_,
        "search_score": search.best_score_,
    }


# ============================================================
# CATBOOST
# ============================================================

def run_catboost_search(
    X_train,
    y_train,
    X_validation,
    y_validation,
):
    """
    Hyperparameter search for CatBoost.

    CatBoost receives the categorical columns directly.
    """

    print("\n" + "=" * 75)
    print("CATBOOST HYPERPARAMETER SEARCH")
    print("=" * 75)

    X_train_cat = X_train.copy()
    X_validation_cat = X_validation.copy()

    # CatBoost expects categorical feature names to remain
    # categorical rather than one-hot encoded.

    model = CatBoostClassifier(
        loss_function="Logloss",
        eval_metric="AUC",
        random_seed=RANDOM_STATE,
        thread_count=CPU_THREADS,
        verbose=False,
        allow_writing_files=False,
        cat_features=CATEGORICAL_FEATURES,
    )

    parameter_space = {
        "iterations": [
            300,
            500,
            800,
            1200,
        ],

        "depth": [
            5,
            6,
            7,
            8,
            10,
        ],

        "learning_rate": [
            0.02,
            0.03,
            0.05,
            0.08,
            0.10,
        ],

        "l2_leaf_reg": [
            1,
            3,
            5,
            10,
            20,
        ],

        "random_strength": [
            0,
            0.5,
            1,
            2,
        ],

        "bagging_temperature": [
            0,
            0.5,
            1,
            2,
        ],
    }

    # CatBoost isn't always pleasant inside RandomizedSearchCV
    # with categorical feature metadata, so we manually sample
    # parameter combinations.

    rng = np.random.default_rng(
        RANDOM_STATE
    )

    parameter_candidates = []

    for _ in range(N_ITER_SEARCH):

        params = {
            key: values[
                rng.integers(
                    0,
                    len(values),
                )
            ]
            for key, values
            in parameter_space.items()
        }

        parameter_candidates.append(
            params
        )

    best_model = None
    best_params = None
    best_score = -np.inf

    for iteration, params in enumerate(
        parameter_candidates,
        start=1,
    ):

        print(
            f"\nCatBoost trial "
            f"{iteration}/{len(parameter_candidates)}"
        )

        print(params)

        model_trial = CatBoostClassifier(
            loss_function="Logloss",
            eval_metric="AUC",
            random_seed=RANDOM_STATE,
            thread_count=CPU_THREADS,
            verbose=False,
            allow_writing_files=False,
            cat_features=CATEGORICAL_FEATURES,
            **params,
        )

        start = time.time()

        model_trial.fit(
            X_train_cat,
            y_train,
            eval_set=(
                X_validation_cat,
                y_validation,
            ),
            verbose=False,
        )

        validation_probabilities = (
            model_trial
            .predict_proba(
                X_validation_cat
            )[:, 1]
        )

        score = average_precision_score(
            y_validation,
            validation_probabilities,
        )

        elapsed = time.time() - start

        print(
            f"Validation PR-AUC: "
            f"{score:.6f}"
        )

        print(
            f"Time: "
            f"{elapsed / 60:.2f} minutes"
        )

        if score > best_score:

            best_score = score
            best_model = model_trial
            best_params = params

            print("NEW BEST CATBOOST MODEL ✅")

    print("\nBest CatBoost parameters:")

    for key, value in best_params.items():
        print(f"{key}: {value}")

    print(
        "\nBest validation PR-AUC:",
        f"{best_score:.6f}",
    )

    validation_probabilities = (
        best_model
        .predict_proba(
            X_validation_cat
        )[:, 1]
    )

    best_threshold, threshold_df = (
        find_best_threshold(
            y_validation,
            validation_probabilities,
        )
    )

    validation_metrics = calculate_metrics(
        y_validation,
        validation_probabilities,
        best_threshold,
    )

    validation_metrics["model"] = "CatBoost"

    print("\nCatBoost validation result:")

    print(
        f"Threshold : "
        f"{best_threshold:.2f}"
    )

    print(
        f"Accuracy  : "
        f"{validation_metrics['accuracy']:.4f}"
    )

    print(
        f"Precision : "
        f"{validation_metrics['precision']:.4f}"
    )

    print(
        f"Recall    : "
        f"{validation_metrics['recall']:.4f}"
    )

    print(
        f"F1        : "
        f"{validation_metrics['f1']:.4f}"
    )

    print(
        f"ROC-AUC   : "
        f"{validation_metrics['roc_auc']:.4f}"
    )

    print(
        f"PR-AUC    : "
        f"{validation_metrics['pr_auc']:.4f}"
    )

    return {
        "model": best_model,
        "threshold": best_threshold,
        "metrics": validation_metrics,
        "threshold_df": threshold_df,
        "best_params": best_params,
        "search_score": best_score,
    }


# ============================================================
# Main
# ============================================================

def main():

    print("=" * 75)
    print("Q-SAFE CLASSICAL THREAT MODEL OPTIMIZATION")
    print("=" * 75)

    print("\nLoading NSL-KDD...")

    train_df = load_dataset(
        TRAIN_PATH
    )

    test_df = load_dataset(
        TEST_PATH
    )

    X_full, y_full = prepare_features(
        train_df
    )

    X_test, y_test = prepare_features(
        test_df
    )

    # ========================================================
    # IMPORTANT:
    #
    # KDDTest+ is completely untouched.
    #
    # We only split KDDTrain+.
    # ========================================================

    (
        X_train,
        X_validation,
        y_train,
        y_validation,
    ) = train_test_split(
        X_full,
        y_full,
        test_size=0.20,
        random_state=RANDOM_STATE,
        stratify=y_full,
    )

    print("\nDataset sizes:")

    print(
        f"Training   : "
        f"{len(X_train):,}"
    )

    print(
        f"Validation : "
        f"{len(X_validation):,}"
    )

    print(
        f"Final test : "
        f"{len(X_test):,}"
    )

    # ========================================================
    # LIGHTGBM
    # ========================================================

    lgb_result = run_lightgbm_search(
        X_train,
        y_train,
        X_validation,
        y_validation,
    )

    # ========================================================
    # CATBOOST
    # ========================================================

    cat_result = run_catboost_search(
        X_train,
        y_train,
        X_validation,
        y_validation,
    )

    # ========================================================
    # Compare candidates
    # ========================================================

    comparison = pd.DataFrame([
        lgb_result["metrics"],
        cat_result["metrics"],
    ])

    comparison = comparison.sort_values(
        by=[
            "f1",
            "recall",
            "pr_auc",
        ],
        ascending=False,
    )

    print("\n" + "=" * 75)
    print("FINAL VALIDATION COMPARISON")
    print("=" * 75)

    print(
        comparison[
            [
                "model",
                "threshold",
                "accuracy",
                "precision",
                "recall",
                "f1",
                "roc_auc",
                "pr_auc",
            ]
        ].to_string(
            index=False,
            float_format=lambda x: f"{x:.4f}",
        )
    )

    RESULTS_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    comparison.to_csv(
        VALIDATION_RESULTS_PATH,
        index=False,
    )

    # ========================================================
    # Choose winner
    # ========================================================

    winner_name = comparison.iloc[0][
        "model"
    ]

    if winner_name == "LightGBM":

        winner_model = lgb_result["model"]
        winner_threshold = lgb_result[
            "threshold"
        ]
        winner_params = lgb_result[
            "best_params"
        ]

    else:

        winner_model = cat_result["model"]
        winner_threshold = cat_result[
            "threshold"
        ]
        winner_params = cat_result[
            "best_params"
        ]

    print("\n" + "=" * 75)
    print("SELECTED CLASSICAL MODEL")
    print("=" * 75)

    print(
        f"Model: {winner_name}"
    )

    print(
        f"Validation threshold: "
        f"{winner_threshold:.2f}"
    )

    print("\nParameters:")

    for key, value in winner_params.items():
        print(f"{key}: {value}")

    # ========================================================
    # Threshold results
    # ========================================================

    lgb_thresholds = (
        lgb_result["threshold_df"]
        .copy()
    )

    lgb_thresholds[
        "model"
    ] = "LightGBM"

    cat_thresholds = (
        cat_result["threshold_df"]
        .copy()
    )

    cat_thresholds[
        "model"
    ] = "CatBoost"

    threshold_results = pd.concat(
        [
            lgb_thresholds,
            cat_thresholds,
        ],
        ignore_index=True,
    )

    threshold_results.to_csv(
        THRESHOLD_RESULTS_PATH,
        index=False,
    )

    # ========================================================
    # RETRAIN WINNER ON ALL KDDTrain+
    # ========================================================

    print("\n" + "=" * 75)
    print(
        "RETRAINING WINNER ON ALL KDDTrain+"
    )
    print("=" * 75)

    if winner_name == "LightGBM":

        final_model = LGBMClassifier(
            objective="binary",
            random_state=RANDOM_STATE,
            n_jobs=CPU_THREADS,
            verbosity=-1,
            **winner_params,
        )

        X_full_lgb = X_full.copy()

        X_test_lgb = X_test.copy()

        for column in CATEGORICAL_FEATURES:

            X_full_lgb[column] = (
                X_full_lgb[column]
                .astype("category")
            )

            X_test_lgb[column] = (
                X_test_lgb[column]
                .astype(
                    pd.api.types.CategoricalDtype(
                        categories=(
                            X_full_lgb[
                                column
                            ].cat.categories
                        )
                    )
                )
            )

        final_model.fit(
            X_full_lgb,
            y_full,
            categorical_feature=(
                CATEGORICAL_FEATURES
            ),
        )

        final_test_probabilities = (
            final_model
            .predict_proba(
                X_test_lgb
            )[:, 1]
        )

    else:

        final_model = CatBoostClassifier(
            loss_function="Logloss",
            random_seed=RANDOM_STATE,
            thread_count=CPU_THREADS,
            verbose=False,
            allow_writing_files=False,
            cat_features=CATEGORICAL_FEATURES,
            **winner_params,
        )

        X_full_cat = X_full.copy()

        X_test_cat = X_test.copy()

        final_model.fit(
            X_full_cat,
            y_full,
            verbose=False,
        )

        final_test_probabilities = (
            final_model
            .predict_proba(
                X_test_cat
            )[:, 1]
        )

    # ========================================================
    # FINAL KDDTest+ EVALUATION
    # ========================================================

    final_metrics = calculate_metrics(
        y_test,
        final_test_probabilities,
        winner_threshold,
    )

    final_metrics["model"] = (
        winner_name
    )

    print("\n" + "=" * 75)
    print("FINAL KDDTest+ RESULT")
    print("=" * 75)

    print(
        f"Model    : {winner_name}"
    )

    print(
        f"Threshold: "
        f"{winner_threshold:.4f}"
    )

    print(
        f"Accuracy : "
        f"{final_metrics['accuracy']:.4f}"
    )

    print(
        f"Precision: "
        f"{final_metrics['precision']:.4f}"
    )

    print(
        f"Recall   : "
        f"{final_metrics['recall']:.4f}"
    )

    print(
        f"F1 Score : "
        f"{final_metrics['f1']:.4f}"
    )

    print(
        f"ROC-AUC  : "
        f"{final_metrics['roc_auc']:.4f}"
    )

    print(
        f"PR-AUC   : "
        f"{final_metrics['pr_auc']:.4f}"
    )

    # ========================================================
    # Classification report
    # ========================================================

    final_predictions = (
        final_test_probabilities
        >= winner_threshold
    ).astype(int)

    print("\nClassification report:\n")

    print(
        classification_report(
            y_test,
            final_predictions,
            target_names=[
                "Normal",
                "Attack",
            ],
            zero_division=0,
        )
    )

    # ========================================================
    # Confusion matrix
    # ========================================================

    cm = confusion_matrix(
        y_test,
        final_predictions,
    )

    print("\nConfusion matrix:")
    print(cm)

    CONFUSION_MATRIX_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
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
        f"Q-Safe Final Threat Model - "
        f"{winner_name}"
    )

    plt.savefig(
        CONFUSION_MATRIX_PATH,
        dpi=200,
        bbox_inches="tight",
    )

    plt.close()

    # ========================================================
    # SAVE MODEL
    # ========================================================

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

    # ========================================================
    # SAVE MODEL INFO
    # ========================================================

    model_info = {
        "model": winner_name,
        "threshold": winner_threshold,
        "random_state": RANDOM_STATE,
        "training_dataset": "KDDTrain+.txt",
        "test_dataset": "KDDTest+.txt",
        "selection_metric": "validation_f1",
        "hyperparameter_search_metric": (
            "validation_pr_auc"
        ),
        "best_parameters": {
            key: (
                value.item()
                if hasattr(value, "item")
                else value
            )
            for key, value
            in winner_params.items()
        },
        "final_test_metrics": final_metrics,
    }

    with open(
        BEST_MODEL_INFO_PATH,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            model_info,
            file,
            indent=4,
        )

    print(
        f"Model information saved to:\n"
        f"{BEST_MODEL_INFO_PATH}"
    )

    # ========================================================
    # SAVE FINAL RESULTS
    # ========================================================

    final_results_df = pd.DataFrame([
        final_metrics
    ])

    final_results_df.to_csv(
        FINAL_RESULTS_PATH,
        index=False,
    )

    print(
        f"Final results saved to:\n"
        f"{FINAL_RESULTS_PATH}"
    )

    print("\n" + "=" * 75)
    print("Q-SAFE ML OPTIMIZATION COMPLETE")
    print("=" * 75)


if __name__ == "__main__":
    main()