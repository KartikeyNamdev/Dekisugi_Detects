import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

# Privacy: keep logging at a level that only shows high-level operational
# events. Route/service code is written to never pass message text, image
# bytes, or app names into log calls in the first place — this is a second
# line of defense, not the only one.
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

from app.routes.analyze import router as analyze_router  # noqa: E402  (after load_dotenv/logging setup)

app = FastAPI(
    title="Is This a Scam? — Fraud Worker Pool",
    description="Privacy-first fraud/scam risk assessment for messages, screenshots, and app names.",
    version="1.0.0",
)

allowed_origins_env = os.environ.get("ALLOWED_ORIGINS", "*")
allowed_origins = [o.strip() for o in allowed_origins_env.split(",")] if allowed_origins_env != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
