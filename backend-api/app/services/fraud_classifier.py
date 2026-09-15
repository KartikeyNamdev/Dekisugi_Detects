"""Builds the classification prompt, calls Claude, and validates the result
against the Pydantic schema. Never lets a malformed/unexpected AI response
crash the API — invalid output is converted into a clean exception the route
layer turns into an AI_INVALID_RESPONSE error."""

import json
import re
from typing import Optional

from pydantic import ValidationError

from app.models import ClaudeClassification
from app.prompts.fraud_prompt import build_system_prompt, build_user_prompt
from app.services import claude_service
from app.services.claude_service import ClaudeServiceError, ClaudeTimeoutError

_JSON_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL)


class ClassificationError(Exception):
    """Wraps any failure in getting a usable classification (AI failure, bad
    JSON, schema mismatch) with a stable machine-readable code."""

    def __init__(self, message: str, code: str):
        super().__init__(message)
        self.code = code


def _extract_json(raw: str) -> dict:
    """Claude is instructed to return raw JSON only, but we defensively strip
    markdown fences or leading/trailing chatter if the model adds any."""
    candidate = raw.strip()

    fence_match = _JSON_FENCE_RE.search(candidate)
    if fence_match:
        candidate = fence_match.group(1).strip()

    # If there's still leading/trailing non-JSON text, try to isolate the
    # outermost {...} block.
    if not candidate.startswith("{"):
        start = candidate.find("{")
        end = candidate.rfind("}")
        if start != -1 and end != -1 and end > start:
            candidate = candidate[start : end + 1]

    try:
        return json.loads(candidate)
    except json.JSONDecodeError as exc:
        raise ClassificationError(f"Model output was not valid JSON: {exc}", "AI_INVALID_RESPONSE") from exc


def classify_input(
    text: Optional[str],
    app_name: Optional[str],
    image_bytes: Optional[bytes] = None,
    image_filename: Optional[str] = None,
    image_content_type: Optional[str] = None,
) -> ClaudeClassification:
    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(text=text, app_name=app_name)

    try:
        raw = claude_service.classify(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            image_bytes=image_bytes,
            image_filename=image_filename,
            image_content_type=image_content_type,
        )
    except ClaudeTimeoutError as exc:
        raise ClassificationError(str(exc), "AI_TIMEOUT") from exc
    except ClaudeServiceError as exc:
        raise ClassificationError(str(exc), "AI_SERVICE_ERROR") from exc

    if not raw:
        raise ClassificationError("Empty response from AI service", "AI_INVALID_RESPONSE")

    parsed = _extract_json(raw)

    try:
        return ClaudeClassification(**parsed)
    except ValidationError as exc:
        raise ClassificationError(f"Model output failed schema validation: {exc}", "AI_INVALID_RESPONSE") from exc
