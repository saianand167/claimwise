"""
ClaimWise FastAPI ML & AI Assistant Service
Provides fraud-risk scoring, feature contribution explanations, model evaluation metrics,
and the LangChain-backed (with deterministic fallback) AI Claim Assistant.
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from assistant import generate_assistant_response
from train_model import ARTIFACTS_DIR, CATEGORICAL_FEATURES, NUMERIC_FEATURES, train_and_save

load_dotenv()

app = FastAPI(
    title="ClaimWise ML & AI Service",
    description="Fraud Risk Intelligence & LangChain Investigation Assistant",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL = None
METRICS: Dict[str, Any] = {}


def ensure_model_loaded():
    global MODEL, METRICS
    model_path = ARTIFACTS_DIR / "fraud_model.joblib"
    metrics_path = ARTIFACTS_DIR / "model_metrics.json"
    if not model_path.exists() or not metrics_path.exists():
        METRICS = train_and_save()
    MODEL = joblib.load(model_path)
    with open(metrics_path, "r", encoding="utf-8") as f:
        METRICS = json.load(f)


ensure_model_loaded()


class ClaimPredictionInput(BaseModel):
    policy_type: str = Field(default="Auto")
    claim_type: str = Field(default="Accident")
    claim_amount: float = Field(gt=0)
    policy_coverage: float = Field(gt=0)
    policy_age_days: float = Field(default=180, ge=0)
    days_to_report: float = Field(default=3, ge=0)
    prior_claims_count: float = Field(default=0, ge=0)
    incident_hour: float = Field(default=14, ge=0, le=23)
    witnesses_count: float = Field(default=1, ge=0)
    police_report_filed: float = Field(default=1, ge=0, le=1)
    document_count: float = Field(default=2, ge=0)
    is_weekend_incident: float = Field(default=0, ge=0, le=1)
    description_length: float = Field(default=120, ge=0)


class AssistantRequest(BaseModel):
    question: str = Field(min_length=1)
    claim: Dict[str, Any]
    prediction: Optional[Dict[str, Any]] = None
    notes: Optional[List[Dict[str, Any]]] = None


def compute_contributing_factors(payload: ClaimPredictionInput, ratio: float) -> List[Dict[str, Any]]:
    factors = []
    if ratio > 0.75:
        factors.append({
            "feature": "claim_to_coverage_ratio",
            "label": "High Claim-to-Coverage Ratio",
            "value": f"{round(ratio * 100, 1)}%",
            "impact": "high",
            "reason": f"Claim requests {round(ratio * 100, 1)}% of total policy coverage.",
        })
    if payload.policy_age_days < 45:
        factors.append({
            "feature": "policy_age_days",
            "label": "Recently Issued Policy",
            "value": f"{int(payload.policy_age_days)} days",
            "impact": "high",
            "reason": f"Incident occurred only {int(payload.policy_age_days)} days after policy start.",
        })
    if payload.days_to_report > 21:
        factors.append({
            "feature": "days_to_report",
            "label": "Delayed Claim Reporting",
            "value": f"{int(payload.days_to_report)} days",
            "impact": "medium",
            "reason": f"Reported {int(payload.days_to_report)} days after incident date.",
        })
    if payload.prior_claims_count >= 2:
        factors.append({
            "feature": "prior_claims_count",
            "label": "Multiple Prior Claims",
            "value": str(int(payload.prior_claims_count)),
            "impact": "medium",
            "reason": f"Customer has {int(payload.prior_claims_count)} prior claims on record.",
        })
    if payload.document_count <= 1:
        factors.append({
            "feature": "document_count",
            "label": "Limited Supporting Documents",
            "value": str(int(payload.document_count)),
            "impact": "medium",
            "reason": f"Only {int(payload.document_count)} supporting document(s) attached.",
        })
    if payload.witnesses_count == 0 and payload.police_report_filed == 0:
        factors.append({
            "feature": "police_report_filed",
            "label": "No Witness or Police Report",
            "value": "0 witnesses / No report",
            "impact": "medium",
            "reason": "Incident has neither third-party witnesses nor a police report.",
        })
    if 0 <= payload.incident_hour <= 4:
        factors.append({
            "feature": "incident_hour",
            "label": "Late-Night Incident Hour",
            "value": f"{int(payload.incident_hour)}:00",
            "impact": "low",
            "reason": "Incident occurred between midnight and 04:00.",
        })

    if not factors:
        factors.append({
            "feature": "baseline_profile",
            "label": "Standard Claim Profile",
            "value": f"{round(ratio * 100, 1)}% coverage",
            "impact": "low",
            "reason": "Claim parameters align with normal historical patterns.",
        })
    return factors


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "claimwise-ml",
        "model_loaded": MODEL is not None,
        "selected_model": METRICS.get("selected_model"),
    }


@app.get("/metrics")
def get_metrics():
    if not METRICS:
        raise HTTPException(status_code=500, detail="Model metrics unavailable")
    return METRICS


@app.post("/retrain")
def retrain_model():
    global METRICS
    METRICS = train_and_save()
    ensure_model_loaded()
    return {"status": "retrained", "metrics": METRICS}


@app.post("/predict")
def predict_fraud_risk(payload: ClaimPredictionInput):
    if MODEL is None:
        raise HTTPException(status_code=503, detail="ML model not initialized")

    ratio = round(payload.claim_amount / payload.policy_coverage, 4)
    row = {
        "policy_type": payload.policy_type,
        "claim_type": payload.claim_type,
        "claim_amount": payload.claim_amount,
        "policy_coverage": payload.policy_coverage,
        "claim_to_coverage_ratio": ratio,
        "policy_age_days": payload.policy_age_days,
        "days_to_report": payload.days_to_report,
        "prior_claims_count": payload.prior_claims_count,
        "incident_hour": payload.incident_hour,
        "witnesses_count": payload.witnesses_count,
        "police_report_filed": payload.police_report_filed,
        "document_count": payload.document_count,
        "is_weekend_incident": payload.is_weekend_incident,
        "description_length": payload.description_length,
    }
    df = pd.DataFrame([row])[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
    prob = float(MODEL.predict_proba(df)[0][1])
    prob = round(min(max(prob, 0.01), 0.99), 4)

    if prob < 0.35:
        risk_level = "Low"
    elif prob < 0.65:
        risk_level = "Medium"
    else:
        risk_level = "High"

    factors = compute_contributing_factors(payload, ratio)

    return {
        "riskScore": prob,
        "riskLevel": risk_level,
        "modelName": METRICS.get("selected_model", "RandomForestClassifier"),
        "contributingFactors": factors,
        "advisoryNotice": "ML risk score is an investigation signal only and does not constitute proof of fraud.",
    }


@app.post("/assistant/chat")
def assistant_chat(req: AssistantRequest):
    return generate_assistant_response(
        question=req.question,
        claim=req.claim,
        prediction=req.prediction,
        notes=req.notes,
    )


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("ML_PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port)

