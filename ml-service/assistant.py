"""
ClaimWise AI Claim Assistant
Uses LangChain with optional configurable LLM provider (Groq / OpenAI) and
strictly deterministic fallback when no API key is configured or on timeout.
"""

import os
from typing import Any, Dict, List, Optional
from langchain_core.prompts import ChatPromptTemplate


def _build_deterministic_summary(claim: Dict[str, Any], prediction: Optional[Dict[str, Any]], notes: List[Dict[str, Any]]) -> str:
    claim_id = claim.get("claimId", "N/A")
    status = claim.get("status", "Unknown")
    amount = claim.get("claimAmount", 0)
    claim_type = claim.get("claimType", "General")
    policy_num = claim.get("policyNumber", "N/A")
    risk_level = (prediction or {}).get("riskLevel", "Not Scored")
    risk_score = (prediction or {}).get("riskScore", 0)
    pct = round(risk_score * 100, 1) if isinstance(risk_score, (int, float)) else 0

    lines = [
        f"**Claim Summary ({claim_id})**",
        f"- **Policy:** {policy_num} | **Type:** {claim_type} | **Amount:** ${amount:,.2f}",
        f"- **Current Status:** {status}",
        f"- **ML Risk Assessment:** {risk_level} ({pct}% fraud-risk signal — advisory only)",
    ]

    validation = claim.get("validationResult") or {}
    issues = validation.get("warnings") or []
    if issues:
        lines.append(f"- **Policy Validation Flags:** {'; '.join(issues)}")
    else:
        lines.append("- **Policy Validation:** All automated policy checks passed.")

    if notes:
        latest = notes[-1]
        lines.append(f"- **Latest Investigation Note:** \"{latest.get('note', '')}\"")
    else:
        lines.append("- **Investigation Notes:** No officer notes recorded yet.")

    return "\n".join(lines)


def _build_risk_explanation(prediction: Optional[Dict[str, Any]]) -> str:
    if not prediction:
        return "No ML risk prediction is attached to this claim yet."

    risk_level = prediction.get("riskLevel", "Low")
    risk_score = prediction.get("riskScore", 0)
    factors = prediction.get("contributingFactors") or []
    lines = [
        f"**Why This Claim Was Flagged as {risk_level} Risk ({round(risk_score * 100, 1)}%)**",
        "Note: An ML risk score is an investigation signal, never automatic proof of fraud.",
    ]
    if factors:
        lines.append("**Top Contributing Signals:**")
        for f in factors[:5]:
            lines.append(f"- **{f.get('label', f.get('feature'))}**: {f.get('reason', f.get('value'))} (impact: {f.get('impact', 'medium')})")
    else:
        lines.append("- Standard baseline risk profile with no elevated anomaly signals.")
    return "\n".join(lines)


def _build_checklist(claim: Dict[str, Any], prediction: Optional[Dict[str, Any]]) -> List[str]:
    claim_type = claim.get("claimType", "General")
    risk_level = (prediction or {}).get("riskLevel", "Low")
    checklist = [
        "Verify claimant identity matches policy holder record.",
        "Confirm policy active status on exact incident date.",
        "Cross-check claimed amount against itemized bills/estimates.",
        f"Verify supporting documents uploaded for {claim_type} claim.",
    ]
    if risk_level in ("Medium", "High"):
        checklist.append("Review timeline gap between incident date and report submission.")
        checklist.append("Check prior claims history for duplicate or overlapping incidents.")
    if claim_type in ("Accident", "Theft"):
        checklist.append("Confirm police report / FIR reference number and date.")
    if claim_type in ("Medical", "Surgery", "Hospitalization"):
        checklist.append("Validate hospital discharge summary and diagnostic invoices.")
    if risk_level == "High":
        checklist.append("Consider requesting additional documentation or conducting a direct claimant call before final decision.")
    return checklist


def generate_assistant_response(
    question: str,
    claim: Dict[str, Any],
    prediction: Optional[Dict[str, Any]] = None,
    notes: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    notes = notes or []
    checklist = _build_checklist(claim, prediction)
    deterministic_summary = _build_deterministic_summary(claim, prediction, notes)
    risk_explanation = _build_risk_explanation(prediction)

    # Check if optional LLM is configured
    provider = os.getenv("LLM_PROVIDER", "groq").lower()
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    timeout_sec = int(os.getenv("LLM_TIMEOUT_SECONDS", "15"))

    if provider == "groq" and groq_key:
        try:
            from langchain_groq import ChatGroq

            llm = ChatGroq(
                api_key=groq_key,
                model=os.getenv("LLM_MODEL", "llama-3.1-8b-instant"),
                temperature=0.2,
                max_tokens=450,
                timeout=timeout_sec,
            )
            prompt = ChatPromptTemplate.from_messages(
                [
                    (
                        "system",
                        "You are ClaimWise AI Assistant helping an insurance claims officer. "
                        "Use ONLY the authorized claim context provided. Never invent facts, and remind the officer "
                        "that ML risk scores are advisory investigation signals, not proof of fraud. Be concise.",
                    ),
                    (
                        "human",
                        "Authorized Claim Context:\n{context}\n\n"
                        "Risk Analysis:\n{risk}\n\n"
                        "Officer Question: {question}",
                    ),
                ]
            )
            chain = prompt | llm
            res = chain.invoke(
                {
                    "context": deterministic_summary,
                    "risk": risk_explanation,
                    "question": question,
                }
            )
            return {
                "mode": "langchain_llm",
                "provider": provider,
                "answer": res.content,
                "summary": deterministic_summary,
                "checklist": checklist,
            }
        except Exception as exc:
            # Safe fallback on timeout or API error
            fallback_note = f"(LLM unavailable: {type(exc).__name__}. Showing deterministic analysis.)\n\n"
            return _deterministic_answer(question, deterministic_summary, risk_explanation, checklist, notes, prefix=fallback_note)

    return _deterministic_answer(question, deterministic_summary, risk_explanation, checklist, notes)


def _deterministic_answer(
    question: str,
    summary: str,
    risk_explanation: str,
    checklist: List[str],
    notes: List[Dict[str, Any]],
    prefix: str = "",
) -> Dict[str, Any]:
    q = question.lower()
    if any(k in q for k in ["why", "flag", "risk", "fraud", "score"]):
        answer = f"{prefix}{risk_explanation}"
    elif any(k in q for k in ["checklist", "step", "review", "verify"]):
        formatted = "\n".join([f"{i+1}. {item}" for i, item in enumerate(checklist)])
        answer = f"{prefix}**Recommended Review Checklist:**\n{formatted}"
    elif any(k in q for k in ["note", "investigation"]):
        if not notes:
            answer = f"{prefix}No investigation notes have been added to this claim yet."
        else:
            formatted = "\n".join([f"- {n.get('authorName', 'Officer')}: {n.get('note', '')}" for n in notes])
            answer = f"{prefix}**Investigation Notes Summary:**\n{formatted}"
    else:
        answer = f"{prefix}{summary}\n\n{risk_explanation}"

    return {
        "mode": "deterministic_fallback",
        "provider": "local_rules",
        "answer": answer,
        "summary": summary,
        "checklist": checklist,
    }

