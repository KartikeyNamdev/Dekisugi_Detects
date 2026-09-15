"""Render's free/Hobby plan doesn't support the "Background Worker" service
type via Blueprint (only HTTP-bound "Web" services) — see the comment in
/render.yaml. This entrypoint runs the exact same Redis consumer loop
(app.redis_worker.run, untouched) in a background thread, alongside a
trivial FastAPI app that exists purely so Render has a port/health check to
bind to. The actual work (BLPOP -> classify -> publish) is unchanged.

Local dev / docker-compose keep using `python -m app.redis_worker` directly
(no such plan restriction there) — this file is Render-specific.

Run with: python -m app.worker_service
"""

import logging
import os
import threading

import uvicorn
from fastapi import FastAPI

from app.redis_worker import run as run_worker

logger = logging.getLogger("fraud_worker_service")

app = FastAPI()


@app.get("/health")
def health():
    return {"status": "ok"}


def main() -> None:
    thread = threading.Thread(target=run_worker, daemon=True, name="redis-worker")
    thread.start()

    port = int(os.environ.get("PORT", "10000"))
    logger.info("Health-check server starting on port %d; consumer running in background thread", port)
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")


if __name__ == "__main__":
    main()
