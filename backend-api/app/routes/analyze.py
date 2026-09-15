import logging
from typing import Optional

from fastapi import APIRouter, Form, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse

from app.models import AnalyzeResponse, ErrorResponse, Indicator, ReportingScript
from app.services import action_generator, rbi_checker
from app.services.fraud_classifier import ClassificationError, classify_input

logger = logging.getLogger("fraud_worker_pool")

router = APIRouter()

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_BYTES = 8 * 1024 * 1024  # 8 MB


def _error(status_code: int, message: str, code: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content=ErrorResponse(error=message, code=code).model_dump())


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    text: Optional[str] = Form(None),
    app_name: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
):
    # --- Input validation -------------------------------------------------
    clean_text = (text or "").strip() or None
    clean_app_name = (app_name or "").strip() or None

    image_bytes = None
    image_filename = None
    image_content_type = None

    if image is not None and image.filename:
        image_content_type = image.content_type
        if image_content_type not in ALLOWED_IMAGE_TYPES:
            return _error(
                415,
                "Unsupported image type. Please upload a JPEG, PNG, WEBP, or GIF.",
                "UNSUPPORTED_FILE_TYPE",
            )

        image_bytes = await image.read()
        if len(image_bytes) > MAX_IMAGE_BYTES:
            return _error(413, "Image is too large. Please upload an image under 8 MB.", "IMAGE_TOO_LARGE")
        if len(image_bytes) == 0:
            image_bytes = None
        else:
            image_filename = image.filename

    if not clean_text and not image_bytes:
        return _error(
            400,
            "Please provide a message, a screenshot, or both.",
            "EMPTY_INPUT",
        )

    # --- Classification (never let AI failures crash the API) -------------
    try:
        classification = classify_input(
            text=clean_text,
            app_name=clean_app_name,
            image_bytes=image_bytes,
            image_filename=image_filename,
            image_content_type=image_content_type,
        )
    except ClassificationError as exc:
        logger.warning("Classification failed with code=%s", exc.code)  # never log message/image content
        status_map = {
            "AI_TIMEOUT": 504,
            "AI_SERVICE_ERROR": 502,
            "AI_INVALID_RESPONSE": 502,
        }
        return _error(
            status_map.get(exc.code, 502),
            "Unable to analyze the message right now.",
            exc.code,
        )
    except Exception:  # noqa: BLE001 - absolute last resort, never leak a traceback
        logger.exception("Unexpected error during classification")
        return _error(500, "Unable to analyze the message right now.", "AI_SERVICE_ERROR")

    # --- RBI lookup (deterministic, local, no AI call) ---------------------
    rbi_result = rbi_checker.check_app(clean_app_name)

    # --- Action guidance (deterministic, no AI call) ------------------------
    immediate_actions = action_generator.generate_immediate_actions(classification.verdict)
    reporting_script: Optional[ReportingScript] = None
    if classification.verdict in ("HIGH_RISK", "MEDIUM_RISK", "LOW_RISK", "INSUFFICIENT_INFORMATION"):
        reporting_script = action_generator.generate_reporting_script(classification.verdict)

    response = AnalyzeResponse(
        verdict=classification.verdict,
        confidence=classification.confidence,
        scam_type=classification.scam_type,
        summary=classification.summary,
        indicators=[Indicator(**i.model_dump()) for i in classification.indicators],
        recommended_action=classification.recommended_action,
        rbi_regulated=rbi_result.rbi_regulated,
        rbi_match=rbi_result.matched_name,
        immediate_actions=immediate_actions,
        reporting_script=reporting_script,
    )

    # Deliberately not logged: clean_text, image_bytes, clean_app_name, or
    # the raw model response — only the final structured verdict is safe to
    # log if you add request logging later, and even that is optional.
    return response
