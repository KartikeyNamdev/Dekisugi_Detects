"""Generates immediate_actions + reporting_script.

Deliberately does NOT invent official procedures. If data/post_incident_procedure.txt
has real (partner-provided) content, it's surfaced verbatim under
reporting_script.partner_procedure_text. Otherwise only generic, safe,
non-authoritative guidance is produced.
"""

from pathlib import Path
from typing import List

from app.models import ReportingScript, Verdict

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
PROCEDURE_PATH = DATA_DIR / "post_incident_procedure.txt"

_GENERIC_HIGH_MEDIUM_RISK_ACTIONS = [
    "Do not click any links in the message.",
    "Do not share your OTP, PIN, password, or card details with anyone.",
    "Do not install any app or grant remote access based on this message.",
    "Verify the message by contacting the institution directly through its official website or app — not through any number or link in the message itself.",
    "If you already shared sensitive details or transferred money, contact your bank immediately to freeze/report the transaction.",
]

_GENERIC_LOW_RISK_ACTIONS = [
    "Avoid clicking any links until you've verified the sender through an official channel.",
    "When in doubt, contact the institution directly using contact details from their official website or app.",
]

_GENERIC_FIELDS_TO_PREPARE = [
    "Transaction / reference ID (if any)",
    "Approximate date and time you received the message",
    "Amount involved, if money was requested or transferred",
    "Sender's phone number, email address, or app used",
    "Screenshots of the message or app",
]


def _load_partner_procedure_text() -> str:
    if not PROCEDURE_PATH.exists():
        return ""
    content = PROCEDURE_PATH.read_text(encoding="utf-8").strip()
    # The placeholder file is entirely made of comment lines starting with
    # "#". Treat a file that's only comments as "no real content yet".
    meaningful_lines = [line for line in content.splitlines() if line.strip() and not line.strip().startswith("#")]
    return "\n".join(meaningful_lines).strip()


def generate_immediate_actions(verdict: Verdict) -> List[str]:
    if verdict in (Verdict.HIGH_RISK, Verdict.MEDIUM_RISK):
        return list(_GENERIC_HIGH_MEDIUM_RISK_ACTIONS)
    if verdict == Verdict.LOW_RISK:
        return list(_GENERIC_LOW_RISK_ACTIONS)
    if verdict == Verdict.INSUFFICIENT_INFORMATION:
        return [
            "There isn't enough information to be confident either way — avoid acting on the message until you can verify it independently.",
            "Contact the institution it claims to be from using contact details from their official website or app.",
        ]
    return []  # LIKELY_LEGITIMATE -> no special action list needed


def generate_reporting_script(verdict: Verdict) -> ReportingScript:
    partner_text = _load_partner_procedure_text()
    return ReportingScript(
        note="Prepare this information before reporting or contacting your bank.",
        fields_to_prepare=list(_GENERIC_FIELDS_TO_PREPARE),
        partner_procedure_text=partner_text if partner_text else None,
    )
