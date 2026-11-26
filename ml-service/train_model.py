"""
ClaimWise ML Training Pipeline
Generates a documented synthetic insurance claims dataset, performs data cleaning,
missing-value imputation, feature engineering, trains Logistic Regression and
Random Forest models, compares evaluation metrics, and persists the best model.
"""

import json
import os
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
ARTIFACTS_DIR = BASE_DIR / "artifacts"

NUMERIC_FEATURES = [
    "claim_amount",
    "policy_coverage",
    "claim_to_coverage_ratio",
    "policy_age_days",
    "days_to_report",
    "prior_claims_count",
    "incident_hour",
    "witnesses_count",
    "police_report_filed",
    "document_count",
    "is_weekend_incident",
    "description_length",
]

CATEGORICAL_FEATURES = ["policy_type", "claim_type"]


def generate_synthetic_dataset(n_samples: int = 2500, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    policy_types = rng.choice(["Health", "Auto", "Property", "Life"], size=n_samples, p=[0.35, 0.35, 0.20, 0.10])
    claim_type_map = {
        "Health": ["Medical", "Surgery", "Hospitalization"],
        "Auto": ["Accident", "Theft", "Liability"],
        "Property": ["Fire", "Natural Disaster", "Theft"],
        "Life": ["Medical", "Liability"],
    }
    claim_types = np.array([rng.choice(claim_type_map[pt]) for pt in policy_types])

    policy_coverage = rng.choice([25000, 50000, 100000, 250000, 500000], size=n_samples, p=[0.2, 0.3, 0.25, 0.15, 0.1])
    policy_age_days = rng.integers(5, 1800, size=n_samples)
    days_to_report = rng.exponential(scale=6.0, size=n_samples).astype(int)
    days_to_report = np.clip(days_to_report, 0, 120)

    prior_claims_count = rng.poisson(lam=0.7, size=n_samples)
    prior_claims_count = np.clip(prior_claims_count, 0, 8)

    incident_hour = rng.integers(0, 24, size=n_samples)
    witnesses_count = rng.choice([0, 1, 2, 3], size=n_samples, p=[0.45, 0.30, 0.15, 0.10])
    police_report_filed = rng.choice([0, 1], size=n_samples, p=[0.42, 0.58])
    document_count = rng.choice([0, 1, 2, 3, 4], size=n_samples, p=[0.08, 0.27, 0.35, 0.20, 0.10])
    is_weekend_incident = rng.choice([0, 1], size=n_samples, p=[0.70, 0.30])
    description_length = rng.integers(25, 450, size=n_samples)

    # Base claim ratio
    base_ratio = rng.beta(a=2.0, b=5.0, size=n_samples)
    claim_amount = np.round(policy_coverage * np.clip(base_ratio * 1.15, 0.02, 1.15), 2)
    claim_to_coverage_ratio = np.round(claim_amount / policy_coverage, 4)

    # Construct realistic fraud risk log-odds with clear, learnable patterns
    logit = -3.4 * np.ones(n_samples)
    logit += np.where(claim_to_coverage_ratio > 0.70, 2.20, 0.0)
    logit += np.where(claim_to_coverage_ratio > 0.90, 1.80, 0.0)
    logit += np.where(policy_age_days < 60, 2.10, 0.0)
    logit += np.where(days_to_report > 21, 1.50, 0.0)
    logit += prior_claims_count * 0.75
    logit += np.where((incident_hour >= 0) & (incident_hour <= 4), 1.15, 0.0)
    logit += np.where((witnesses_count == 0) & (police_report_filed == 0), 1.40, 0.0)
    logit += np.where(document_count <= 1, 1.25, -0.65)
    logit += np.where(description_length < 60, 0.95, 0.0)
    logit += np.where(claim_types == "Theft", 0.55, 0.0)
    logit += rng.normal(0, 0.25, size=n_samples)

    prob = 1.0 / (1.0 + np.exp(-logit))
    is_fraud = (rng.random(n_samples) < prob).astype(int)

    df = pd.DataFrame(
        {
            "policy_type": policy_types,
            "claim_type": claim_types,
            "claim_amount": claim_amount,
            "policy_coverage": policy_coverage.astype(float),
            "claim_to_coverage_ratio": claim_to_coverage_ratio,
            "policy_age_days": policy_age_days.astype(float),
            "days_to_report": days_to_report.astype(float),
            "prior_claims_count": prior_claims_count.astype(float),
            "incident_hour": incident_hour.astype(float),
            "witnesses_count": witnesses_count.astype(float),
            "police_report_filed": police_report_filed.astype(float),
            "document_count": document_count.astype(float),
            "is_weekend_incident": is_weekend_incident.astype(float),
            "description_length": description_length.astype(float),
            "is_fraud": is_fraud,
        }
    )

    # Inject ~3% realistic missing values to test imputation pipeline
    for col in ["days_to_report", "witnesses_count", "police_report_filed"]:
        mask = rng.random(n_samples) < 0.03
        df.loc[mask, col] = np.nan

    return df


def clean_dataset(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df = df.drop_duplicates()
    df = df[df["claim_amount"] > 0]
    df = df[df["policy_coverage"] > 0]
    df["claim_to_coverage_ratio"] = np.round(df["claim_amount"] / df["policy_coverage"], 4)
    return df


def build_preprocessor() -> ColumnTransformer:
    numeric_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    return ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, NUMERIC_FEATURES),
            ("cat", categorical_transformer, CATEGORICAL_FEATURES),
        ]
    )


def evaluate_model(name: str, model: Pipeline, X_test: pd.DataFrame, y_test: pd.Series) -> dict:
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    cm = confusion_matrix(y_test, y_pred).tolist()
    return {
        "model_name": name,
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
        "f1_score": round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, y_prob)), 4),
        "confusion_matrix": cm,
    }


def extract_feature_importances(model: Pipeline) -> list[dict]:
    preprocessor = model.named_steps["preprocessor"]
    clf = model.named_steps["classifier"]
    feature_names = preprocessor.get_feature_names_out()

    if hasattr(clf, "feature_importances_"):
        importances = clf.feature_importances_
    elif hasattr(clf, "coef_"):
        importances = np.abs(clf.coef_[0])
        importances = importances / (importances.sum() + 1e-9)
    else:
        importances = np.zeros(len(feature_names))

    items = []
    for fname, imp in zip(feature_names, importances):
        clean_name = fname.replace("num__", "").replace("cat__", "")
        items.append({"feature": clean_name, "importance": round(float(imp), 4)})

    items.sort(key=lambda x: x["importance"], reverse=True)
    return items[:10]


def train_and_save() -> dict:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    raw_df = generate_synthetic_dataset(n_samples=2500, seed=42)
    raw_df.to_csv(DATA_DIR / "insurance_claims_synthetic.csv", index=False)

    df = clean_dataset(raw_df)
    X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
    y = df["is_fraud"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    lr_pipeline = Pipeline(
        steps=[
            ("preprocessor", build_preprocessor()),
            ("classifier", LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42)),
        ]
    )
    rf_pipeline = Pipeline(
        steps=[
            ("preprocessor", build_preprocessor()),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=180,
                    max_depth=10,
                    min_samples_leaf=4,
                    class_weight="balanced",
                    random_state=42,
                ),
            ),
        ]
    )

    lr_pipeline.fit(X_train, y_train)
    rf_pipeline.fit(X_train, y_train)

    lr_metrics = evaluate_model("LogisticRegression", lr_pipeline, X_test, y_test)
    rf_metrics = evaluate_model("RandomForestClassifier", rf_pipeline, X_test, y_test)

    # Select best model by F1 score (tie-breaker ROC-AUC)
    if (rf_metrics["f1_score"], rf_metrics["roc_auc"]) >= (lr_metrics["f1_score"], lr_metrics["roc_auc"]):
        best_model = rf_pipeline
        selected_name = "RandomForestClassifier"
        selected_metrics = rf_metrics
    else:
        best_model = lr_pipeline
        selected_name = "LogisticRegression"
        selected_metrics = lr_metrics

    top_features = extract_feature_importances(best_model)

    summary = {
        "dataset_size": int(len(df)),
        "train_size": int(len(X_train)),
        "test_size": int(len(X_test)),
        "fraud_rate": round(float(y.mean()), 4),
        "selected_model": selected_name,
        "selected_metrics": selected_metrics,
        "model_comparison": [lr_metrics, rf_metrics],
        "top_features": top_features,
    }

    joblib.dump(best_model, ARTIFACTS_DIR / "fraud_model.joblib")
    with open(ARTIFACTS_DIR / "model_metrics.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"[ClaimWise ML] Trained on {len(df)} records. Selected: {selected_name} (F1={selected_metrics['f1_score']}, AUC={selected_metrics['roc_auc']})")
    return summary


if __name__ == "__main__":
    train_and_save()
