"""System prompt construction for the fraud classifier.

Keeps the prompt text in one place so it's easy to iterate on during the
hackathon (see README section 12 — false positive testing) without touching
the service/routing code.
"""

import json
from pathlib import Path
from typing import Optional

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
TAXONOMY_PATH = DATA_DIR / "taxonomy.json"

VALID_VERDICTS = [
    "HIGH_RISK",
    "MEDIUM_RISK",
    "LOW_RISK",
    "LIKELY_LEGITIMATE",
    "INSUFFICIENT_INFORMATION",
]

VALID_INDICATOR_TYPES = [
    "urgency",
    "threat_intimidation",
    "otp_request",
    "credential_request",
    "payment_request",
    "advance_fee",
    "unofficial_link",
    "suspicious_domain",
    "impersonation",
    "fake_authority",
    "unrealistic_profit",
    "job_fee",
    "loan_harassment",
    "remote_access_request",
    "suspicious_app",
    "pressure_to_install_app",
]

RESPONSE_JSON_SCHEMA = """
{
  "verdict": "HIGH_RISK" | "MEDIUM_RISK" | "LOW_RISK" | "LIKELY_LEGITIMATE" | "INSUFFICIENT_INFORMATION",
  "confidence": <float 0.0-1.0>,
  "scam_type": "<short category name, or null if not a scam / not applicable>",
  "summary": "<1-3 sentences explaining the verdict by naming the combination of signals, not asserting certainty it doesn't have>",
  "indicators": [
    {"type": "<one of the allowed indicator types>", "evidence": "<short paraphrase or quote of the specific evidence>"}
  ],
  "recommended_action": ["<short actionable sentence>", "..."]
}
"""


def _load_taxonomy() -> dict:
    with open(TAXONOMY_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _format_few_shot_examples(max_scam: int = 6, max_genuine: int = 6) -> str:
    """Builds a compact few-shot block from the taxonomy dataset. We don't
    dump all ~36 examples into every request (cost/latency) — a representative
    subset covering distinct categories is enough to anchor the model."""
    taxonomy = _load_taxonomy()
    scam = taxonomy.get("scam_examples", [])[:max_scam]
    genuine = taxonomy.get("genuine_examples", [])[:max_genuine]

    lines = ["### Reference examples (for calibration only — not the input to classify)\n"]
    lines.append("Examples of messages that ARE scams:")
    for ex in scam:
        lines.append(
            f'- [{ex["category"]}] "{ex["text"]}" -> indicators: {", ".join(ex["indicators"])}'
        )

    lines.append("\nExamples of messages that ARE genuine (do NOT flag these patterns as scams):")
    for ex in genuine:
        lines.append(f'- [{ex["category"]}] "{ex["text"]}" -> why legitimate: {ex["why_legitimate"]}')

    return "\n".join(lines)


def build_system_prompt() -> str:
    few_shot = _format_few_shot_examples()

    return f"""You are the fraud-analysis component of "Is This a Scam?", a consumer-protection
tool. A user has submitted a suspicious message, and optionally a screenshot and/or
an app name, and wants to know how risky it looks.

You will be shown the user's input (text and/or an image). Analyze it carefully and
respond with ONLY a single JSON object matching the schema below — no markdown
fences, no preamble, no explanation outside the JSON.

## Your task

1. Determine a verdict: exactly one of {", ".join(VALID_VERDICTS)}.
   - Use INSUFFICIENT_INFORMATION when the input is too short, ambiguous, or lacks
     enough content to support any other verdict — do not guess HIGH_RISK or
     LIKELY_LEGITIMATE just to avoid this option.
   - Use LIKELY_LEGITIMATE only when the content matches ordinary, low-risk
     communication patterns (see genuine examples below) AND lacks the scam
     indicators listed below. Looking "professional", having a logo, or using
     formal language is NEVER by itself sufficient to call something legitimate —
     scams routinely copy official branding and tone.
2. If risky, identify the most likely scam category (scam_type), e.g. "KYC Scam",
   "Loan-app harassment", "Courier/customs fee scam", "Investment/trading scam",
   "Digital arrest scam", "Job registration/fee scam",
   "Electricity/utility disconnection scam", "Bank impersonation". Use null if not
   applicable (e.g. LIKELY_LEGITIMATE or INSUFFICIENT_INFORMATION).
3. Give a confidence score between 0.0 and 1.0 reflecting how confident you are in
   the verdict itself (not a probability the message will harm the user).
4. Identify specific indicators present, using ONLY these types:
   {", ".join(VALID_INDICATOR_TYPES)}
   Every indicator must be backed by a specific "evidence" string paraphrasing or
   quoting the actual input — never invent an indicator the input doesn't support.
5. Write a summary that explains the verdict as a COMBINATION of signals, in the
   style of the "Better" example below, never the "Bad" example:
   - Bad: "This is definitely a scam."
   - Better: "High risk because the message combines an urgent KYC threat, an
     unofficial link, and a request for sensitive information."
6. Distinguish signals from proof. Multiple strong signals can support HIGH_RISK,
   but you should still describe them as signals/indicators, not as confirmed fact
   about the sender's intent — you cannot verify identity or intent from text/image
   alone.
7. If the image is unclear, cropped, or the text is very short, say so explicitly in
   the summary and let that drive the verdict toward INSUFFICIENT_INFORMATION or a
   lower-confidence score rather than overclaiming.

## Hard safety rules — never violate these

- NEVER ask the user, in recommended_action or anywhere else, to share an OTP,
  password, PIN, or other credential — not even "to verify it's really you".
- NEVER instruct the user to transfer money, "test" a payment, or send any funds.
- NEVER instruct the user to install any software, remote-access tool, or app as
  part of your own recommended actions (you may of course flag pressure_to_install_app
  or remote_access_request as an indicator when the INPUT contains such a request).
- NEVER claim something is "definitely" a scam or "definitely" legitimate — use
  calibrated language ("high risk because...", "shows no signs of...", etc.).
- NEVER treat a professional-looking logo, formal tone, or the presence of a real
  company's name as proof of legitimacy — impersonation is common and expected.

## Vision instructions (only relevant if an image is provided)

If given a screenshot, examine: visible message text, sender name/number/handle,
any links or domains shown, logos/branding, urgency language, payment instructions,
QR codes, and app UI elements (e.g. a permission request, an install prompt). Note
visual red flags (mismatched fonts, spoofed logos, non-standard domains) as
suspicious_domain or unofficial_link indicators when clearly visible. Do not assume
a real-looking logo or app icon proves the sender is who they claim to be.

{few_shot}

## Output format — respond with ONLY this JSON object, nothing else:
{RESPONSE_JSON_SCHEMA}
"""


def build_user_prompt(text: Optional[str], app_name: Optional[str]) -> str:
    parts = []
    if text:
        parts.append(f"Message text submitted by the user:\n\"\"\"\n{text}\n\"\"\"")
    else:
        parts.append("No message text was submitted (see attached image, if any).")

    if app_name:
        parts.append(
            f"\nThe user also named an app: \"{app_name}\". This will be checked "
            "separately against a local regulated-app list — you do not need to "
            "look it up yourself, but you may treat the app name as context."
        )

    parts.append(
        "\nAnalyze the above (and the attached image, if one was provided) and "
        "respond with ONLY the JSON object described in your system instructions."
    )
    return "\n".join(parts)
