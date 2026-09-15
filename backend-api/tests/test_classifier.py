import json
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models import Verdict
from app.services import claude_service
from app.services.fraud_classifier import ClassificationError, classify_input

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
TAXONOMY = json.loads((DATA_DIR / "taxonomy.json").read_text(encoding="utf-8"))

client = TestClient(app)


def _mock_response(payload: dict) -> str:
    return json.dumps(payload)


def _scam_style_response(scam_type: str, indicator_types):
    return _mock_response(
        {
            "verdict": "HIGH_RISK",
            "confidence": 0.9,
            "scam_type": scam_type,
            "summary": f"High risk because the message shows {', '.join(indicator_types)}.",
            "indicators": [{"type": t, "evidence": "evidence text"} for t in indicator_types],
            "recommended_action": [
                "Do not click the link.",
                "Do not share OTP or banking credentials.",
            ],
        }
    )


def _genuine_style_response(reason: str):
    return _mock_response(
        {
            "verdict": "LIKELY_LEGITIMATE",
            "confidence": 0.85,
            "scam_type": None,
            "summary": f"Shows no scam indicators: {reason}",
            "indicators": [],
            "recommended_action": [],
        }
    )


# ---------------------------------------------------------------------------
# Schema / JSON validity tests
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "scam_type,indicators",
    [
        ("KYC Scam", ["urgency", "unofficial_link"]),
        ("Loan-app harassment", ["threat_intimidation", "payment_request"]),
        ("Courier/customs fee scam", ["advance_fee", "urgency"]),
        ("Investment/trading scam", ["unrealistic_profit"]),
        ("Digital arrest scam", ["fake_authority", "threat_intimidation"]),
        ("Job registration/fee scam", ["job_fee", "advance_fee"]),
        ("Electricity/utility disconnection scam", ["urgency", "pressure_to_install_app"]),
        ("Bank impersonation", ["impersonation", "otp_request"]),
    ],
)
def test_scam_categories_produce_valid_schema(scam_type, indicators):
    with patch.object(claude_service, "classify", return_value=_scam_style_response(scam_type, indicators)):
        result = classify_input(text="some suspicious message", app_name=None)

    assert result.verdict == Verdict.HIGH_RISK
    assert 0.0 <= result.confidence <= 1.0
    assert result.scam_type == scam_type
    assert len(result.indicators) == len(indicators)
    for ind in result.indicators:
        assert ind.type.value in indicators


def test_confidence_out_of_range_is_rejected():
    bad_response = _mock_response(
        {
            "verdict": "HIGH_RISK",
            "confidence": 1.5,  # invalid
            "scam_type": "KYC Scam",
            "summary": "test",
            "indicators": [],
            "recommended_action": [],
        }
    )
    with patch.object(claude_service, "classify", return_value=bad_response):
        with pytest.raises(ClassificationError) as exc_info:
            classify_input(text="test", app_name=None)
    assert exc_info.value.code == "AI_INVALID_RESPONSE"


def test_invalid_verdict_value_is_rejected():
    bad_response = _mock_response(
        {
            "verdict": "TOTALLY_A_SCAM",  # not a valid enum value
            "confidence": 0.9,
            "scam_type": "KYC Scam",
            "summary": "test",
            "indicators": [],
            "recommended_action": [],
        }
    )
    with patch.object(claude_service, "classify", return_value=bad_response):
        with pytest.raises(ClassificationError) as exc_info:
            classify_input(text="test", app_name=None)
    assert exc_info.value.code == "AI_INVALID_RESPONSE"


def test_malformed_json_does_not_crash_raises_classification_error():
    with patch.object(claude_service, "classify", return_value="not json at all {{{"):
        with pytest.raises(ClassificationError) as exc_info:
            classify_input(text="test", app_name=None)
    assert exc_info.value.code == "AI_INVALID_RESPONSE"


def test_json_wrapped_in_markdown_fence_is_still_parsed():
    payload = {
        "verdict": "LOW_RISK",
        "confidence": 0.4,
        "scam_type": None,
        "summary": "test",
        "indicators": [],
        "recommended_action": [],
    }
    fenced = f"```json\n{json.dumps(payload)}\n```"
    with patch.object(claude_service, "classify", return_value=fenced):
        result = classify_input(text="test", app_name=None)
    assert result.verdict == Verdict.LOW_RISK


# ---------------------------------------------------------------------------
# False-positive suite: genuine examples should never come back HIGH_RISK
# ---------------------------------------------------------------------------


def test_genuine_examples_not_flagged_high_risk():
    for example in TAXONOMY["genuine_examples"]:
        mock_reply = _genuine_style_response(example["why_legitimate"])
        with patch.object(claude_service, "classify", return_value=mock_reply):
            result = classify_input(text=example["text"], app_name=None)
        assert result.verdict != Verdict.HIGH_RISK, f"False positive on {example['id']}"


# ---------------------------------------------------------------------------
# API-level tests (TestClient) — error handling
# ---------------------------------------------------------------------------


def test_analyze_rejects_empty_input():
    resp = client.post("/analyze", data={"text": "", "app_name": ""})
    assert resp.status_code == 400
    assert resp.json()["code"] == "EMPTY_INPUT"


def test_analyze_rejects_unsupported_file_type():
    resp = client.post(
        "/analyze",
        data={"text": "hello"},
        files={"image": ("note.txt", b"not an image", "text/plain")},
    )
    assert resp.status_code == 415
    assert resp.json()["code"] == "UNSUPPORTED_FILE_TYPE"


def test_analyze_rejects_oversized_image():
    big_bytes = b"0" * (8 * 1024 * 1024 + 1)
    resp = client.post(
        "/analyze",
        data={"text": "hello"},
        files={"image": ("big.png", big_bytes, "image/png")},
    )
    assert resp.status_code == 413
    assert resp.json()["code"] == "IMAGE_TOO_LARGE"


def test_analyze_handles_claude_service_failure_gracefully():
    with patch(
        "app.routes.analyze.classify_input",
        side_effect=ClassificationError("boom", "AI_SERVICE_ERROR"),
    ):
        resp = client.post("/analyze", data={"text": "Your KYC has expired, click now"})
    assert resp.status_code == 502
    body = resp.json()
    assert body["code"] == "AI_SERVICE_ERROR"
    assert "error" in body
    # never leak internals
    assert "boom" not in json.dumps(body)


def test_analyze_happy_path_end_to_end_with_mocked_claude():
    mock_reply = _scam_style_response("KYC Scam", ["urgency", "unofficial_link"])
    with patch.object(claude_service, "classify", return_value=mock_reply):
        resp = client.post(
            "/analyze",
            data={"text": "Your KYC has expired. Click this link immediately.", "app_name": "Example Bank Personal Loans"},
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["verdict"] == "HIGH_RISK"
    assert 0.0 <= body["confidence"] <= 1.0
    assert body["rbi_regulated"] is True
    assert body["rbi_match"] == "Example Bank Personal Loans"
    assert len(body["immediate_actions"]) > 0
    assert body["reporting_script"]["fields_to_prepare"]


def test_analyze_rbi_not_found_for_unknown_app():
    mock_reply = _genuine_style_response("standard bank alert")
    with patch.object(claude_service, "classify", return_value=mock_reply):
        resp = client.post(
            "/analyze",
            data={"text": "Your statement is ready.", "app_name": "SomeRandomAppNotOnList"},
        )
    assert resp.status_code == 200
    assert resp.json()["rbi_regulated"] == "NOT_FOUND"
