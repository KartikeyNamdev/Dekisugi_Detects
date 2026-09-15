"""Redis consumer for the Node backend's job queue (see /CONTRACT.md).

Pulls jobs pushed to the `fraud:jobs` list, runs them through the existing
classification pipeline (classify_input / rbi_checker / action_generator —
the same code the HTTP POST /analyze endpoint uses, untouched), adapts the
result via result_adapter into the schema the Node backend and frontend
expect, and publishes it back over Redis.

Run standalone: `python -m app.redis_worker`
"""

import base64
import json
import logging
import os
import time

from dotenv import load_dotenv

load_dotenv()

import redis

from app.services import action_generator, rbi_checker
from app.services.fraud_classifier import ClassificationError, classify_input
from app.services.result_adapter import build_error_result, build_fraud_result

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("fraud_worker_redis")

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
RESULT_TTL_SECONDS = int(os.environ.get("RESULT_TTL_SECONDS", "120"))
JOB_LIST_KEY = "fraud:jobs"

_REPORTABLE_VERDICTS = {"HIGH_RISK", "MEDIUM_RISK", "LOW_RISK", "INSUFFICIENT_INFORMATION"}


def _result_key(session_id: str) -> str:
    return f"result:{session_id}"


def process_job(job: dict) -> dict:
    """Pure function: job dict in, result dict out. Never raises — any
    failure is converted into a build_error_result payload so the Node
    backend's long-poll always gets *something* back."""
    session_id = job.get("sessionId", "unknown")
    job_type = job.get("type")

    # A "call" is a free-text description of a call (transcribed client-side
    # via the Web Speech API); the classifier only knows about `text`, so
    # feed it through the same field.
    text = job.get("text") or (job.get("callDescription") if job_type == "call" else None)
    app_name = job.get("appName")

    image_bytes = None
    image_filename = None
    image_content_type = job.get("imageMimeType")
    if job.get("imageBase64"):
        try:
            image_bytes = base64.b64decode(job["imageBase64"])
            image_filename = f"{session_id}.img"
        except (ValueError, TypeError):
            logger.warning("session=%s could not decode imageBase64", session_id)

    try:
        classification = classify_input(
            text=text,
            app_name=app_name,
            image_bytes=image_bytes,
            image_filename=image_filename,
            image_content_type=image_content_type,
        )
    except ClassificationError as exc:
        logger.warning("session=%s classification failed code=%s", session_id, exc.code)
        return build_error_result(session_id, exc.code)
    except Exception:  # noqa: BLE001 - never let a bad job kill the worker loop
        logger.exception("session=%s unexpected classification failure", session_id)
        return build_error_result(session_id, "AI_SERVICE_ERROR")

    rbi_result = rbi_checker.check_app(app_name)
    immediate_actions = action_generator.generate_immediate_actions(classification.verdict)
    reporting_script = None
    if classification.verdict.value in _REPORTABLE_VERDICTS:
        reporting_script = action_generator.generate_reporting_script(classification.verdict)

    return build_fraud_result(
        session_id=session_id,
        classification=classification,
        rbi_result=rbi_result,
        app_name=app_name,
        immediate_actions=immediate_actions,
        reporting_script=reporting_script,
    )


def run() -> None:
    client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
    logger.info("Redis worker started — watching '%s' at %s", JOB_LIST_KEY, REDIS_URL)

    while True:
        try:
            popped = client.blpop(JOB_LIST_KEY, timeout=5)
        except redis.exceptions.ConnectionError:
            logger.warning("Redis connection lost, retrying in 2s")
            time.sleep(2)
            continue

        if not popped:
            continue  # timed out waiting, loop again

        _, raw_job = popped
        try:
            job = json.loads(raw_job)
        except json.JSONDecodeError:
            logger.error("Dropped unparseable job payload")
            continue

        session_id = job.get("sessionId", "unknown")
        logger.info("session=%s processing type=%s", session_id, job.get("type"))

        result = process_job(job)
        payload = json.dumps(result)
        client.set(_result_key(session_id), payload, ex=RESULT_TTL_SECONDS)
        client.publish(_result_key(session_id), payload)
        logger.info("session=%s result published verdict=%s", session_id, result.get("verdict"))


if __name__ == "__main__":
    run()
