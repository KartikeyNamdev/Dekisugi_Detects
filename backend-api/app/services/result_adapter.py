"""Adapts the existing classification pipeline's output (ClaudeClassification
+ RbiLookupResult + action_generator output) into the FraudResult JSON shape
the Node backend / frontend expect (see /CONTRACT.md).

Kept separate from routes/analyze.py on purpose: the HTTP /analyze endpoint
and its response schema (AnalyzeResponse in app/models.py) are untouched and
keep working exactly as already built and tested. This module is only used
by the new Redis consumer (app/redis_worker.py).
"""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from app.models import ClaudeClassification, ReportingScript, Verdict
from app.services.rbi_checker import RbiLookupResult

_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
_RBI_APPS_PATH = _DATA_DIR / "rbi_apps.json"

_VERDICT_MAP = {
    Verdict.HIGH_RISK: "likely_scam",
    Verdict.MEDIUM_RISK: "likely_scam",
    Verdict.LOW_RISK: "uncertain",
    Verdict.LIKELY_LEGITIMATE: "likely_genuine",
    Verdict.INSUFFICIENT_INFORMATION: "uncertain",
}

_SOURCES = [
    "https://cybercrime.gov.in",
    "https://www.rbi.org.in/",
]

_FALLBACK_ACTIONS = [
    "Do not click any links in the message.",
    "Do not share your OTP, PIN, password, or card details with anyone.",
    "Verify by contacting the institution directly through its official website or app.",
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _rbi_last_updated() -> Optional[str]:
    try:
        with open(_RBI_APPS_PATH, "r", encoding="utf-8") as f:
            return json.load(f).get("last_updated")
    except (OSError, json.JSONDecodeError):
        return None


def _format_reporting_script(script: Optional[ReportingScript]) -> Optional[str]:
    if script is None:
        return None
    lines = [script.note, "", "Have ready:"]
    lines += [f"- {field}" for field in script.fields_to_prepare]
    if script.partner_procedure_text:
        lines += ["", script.partner_procedure_text]
    return "\n".join(lines)


def _lending_app_check(app_name: Optional[str], rbi_result: RbiLookupResult) -> Optional[dict]:
    if not app_name:
        return None
    return {
        "appName": app_name,
        "matched": rbi_result.rbi_regulated is True,
        "matchedEntry": rbi_result.matched_name,
        "listLastUpdated": _rbi_last_updated(),
    }


def build_fraud_result(
    session_id: str,
    classification: ClaudeClassification,
    rbi_result: RbiLookupResult,
    app_name: Optional[str],
    immediate_actions: List[str],
    reporting_script: Optional[ReportingScript],
) -> dict:
    return {
        "sessionId": session_id,
        "verdict": _VERDICT_MAP[classification.verdict],
        "confidence": classification.confidence,
        "indicators": [
            {"label": ind.type.value, "detail": ind.evidence} for ind in classification.indicators
        ],
        "summary": classification.summary,
        "actionList": immediate_actions,
        "reportingScript": _format_reporting_script(reporting_script),
        "lendingAppCheck": _lending_app_check(app_name, rbi_result),
        "sources": list(_SOURCES),
        "completedAt": _now_iso(),
    }


def build_error_result(session_id: str, error_code: str) -> dict:
    return {
        "sessionId": session_id,
        "verdict": "uncertain",
        "confidence": 0.0,
        "indicators": [],
        "summary": (
            "We couldn't complete an automated analysis right now. Use general "
            "caution: don't click links, don't share OTPs or passwords, and "
            "verify directly with the institution using contact details from "
            "its official app or website."
        ),
        "actionList": list(_FALLBACK_ACTIONS),
        "reportingScript": None,
        "lendingAppCheck": None,
        "sources": list(_SOURCES),
        "completedAt": _now_iso(),
        "error": error_code,
    }
