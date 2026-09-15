"""Thin wrapper around the Anthropic client.

Isolated here so fraud_classifier.py doesn't need to know about SDK details,
retries, or timeouts, and so tests can mock this single call point.
"""

import base64
import os
from typing import Optional

import anthropic

CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-5")
CLAUDE_TIMEOUT_SECONDS = float(os.environ.get("CLAUDE_TIMEOUT_SECONDS", "25"))
MAX_TOKENS = 1024


class ClaudeServiceError(Exception):
    """Raised for any failure talking to Claude (auth, network, bad status)."""


class ClaudeTimeoutError(ClaudeServiceError):
    """Raised when the Claude call exceeds CLAUDE_TIMEOUT_SECONDS."""


_client: Optional[anthropic.Anthropic] = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise ClaudeServiceError("ANTHROPIC_API_KEY is not set")
        _client = anthropic.Anthropic(api_key=api_key, timeout=CLAUDE_TIMEOUT_SECONDS)
    return _client


def _image_media_type(filename: str, content_type: Optional[str]) -> str:
    if content_type in ("image/jpeg", "image/png", "image/webp", "image/gif"):
        return content_type
    lowered = (filename or "").lower()
    if lowered.endswith((".jpg", ".jpeg")):
        return "image/jpeg"
    if lowered.endswith(".png"):
        return "image/png"
    if lowered.endswith(".webp"):
        return "image/webp"
    if lowered.endswith(".gif"):
        return "image/gif"
    return "image/jpeg"


def classify(
    system_prompt: str,
    user_prompt: str,
    image_bytes: Optional[bytes] = None,
    image_filename: Optional[str] = None,
    image_content_type: Optional[str] = None,
) -> str:
    """Sends the prompt (and optional image) to Claude and returns the raw
    text response. Raises ClaudeServiceError / ClaudeTimeoutError on failure.
    Does not parse or validate JSON — that's fraud_classifier's job.
    """
    client = _get_client()

    content = []
    if image_bytes:
        media_type = _image_media_type(image_filename or "", image_content_type)
        content.append(
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": media_type,
                    "data": base64.b64encode(image_bytes).decode("utf-8"),
                },
            }
        )
    content.append({"type": "text", "text": user_prompt})

    try:
        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=MAX_TOKENS,
            system=system_prompt,
            messages=[{"role": "user", "content": content}],
        )
    except anthropic.APITimeoutError as exc:
        raise ClaudeTimeoutError(str(exc)) from exc
    except anthropic.APIError as exc:
        raise ClaudeServiceError(str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 - never leak internals, wrap everything
        raise ClaudeServiceError(str(exc)) from exc

    text_parts = [block.text for block in response.content if getattr(block, "type", None) == "text"]
    return "\n".join(text_parts).strip()
