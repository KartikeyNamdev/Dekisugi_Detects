import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { env } from "../config/env";
import { newSessionId, enqueueJob } from "../services/session";
import { waitForResult, peekResult } from "../services/resultService";
import type { FraudJob, IntakeType } from "../types/job";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes },
});

const router = Router();

const bodySchema = z.object({
  type: z.enum(["screenshot", "text", "call", "app"]),
  text: z.string().max(10_000).optional(),
  appName: z.string().max(200).optional(),
  callDescription: z.string().max(10_000).optional(),
  language: z.string().max(20).optional(),
});

/**
 * POST /api/analyze
 * multipart/form-data with fields: type, text?, appName?, callDescription?, language?
 * and an optional `screenshot` file (required when type === "screenshot").
 *
 * Generates an ephemeral session, writes the job to Redis (see /CONTRACT.md),
 * and returns { sessionId } immediately. Raw audio never reaches this
 * endpoint — the FE transcribes voice client-side via the Web Speech API
 * and sends the resulting text as `callDescription`.
 */
router.post("/", upload.single("screenshot"), async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_request", details: parsed.error.flatten() });
  }
  const { type, text, appName, callDescription, language } = parsed.data;

  if (type === "screenshot" && !req.file) {
    return res.status(400).json({ error: "missing_screenshot" });
  }
  if (type === "text" && !text) {
    return res.status(400).json({ error: "missing_text" });
  }
  if (type === "call" && !callDescription) {
    return res.status(400).json({ error: "missing_call_description" });
  }
  if (type === "app" && !appName) {
    return res.status(400).json({ error: "missing_app_name" });
  }

  const sessionId = newSessionId();
  const job: FraudJob = {
    sessionId,
    type: type as IntakeType,
    text,
    appName,
    callDescription,
    language: language ?? "en",
    createdAt: new Date().toISOString(),
  };
  if (req.file) {
    job.imageBase64 = req.file.buffer.toString("base64");
    job.imageMimeType = req.file.mimetype;
  }

  await enqueueJob(job);

  res.status(202).json({ sessionId, status: "processing" });
});

/**
 * GET /api/analyze/:sessionId/result
 * Long-polls for up to RESULT_WAIT_TIMEOUT_MS. Returns 200 with the result
 * once ready (and immediately deletes it from Redis), or 202 { status:
 * "processing" } if the timeout elapses first — the FE should call again.
 */
router.get("/:sessionId/result", async (req, res) => {
  const { sessionId } = req.params;
  try {
    const outcome = await waitForResult(sessionId);
    if (outcome.status === "done") {
      return res.status(200).json(outcome.result);
    }
    return res.status(202).json({ status: "processing" });
  } catch (err) {
    console.error("[analyze] waitForResult failed", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * GET /api/analyze/:sessionId/status
 * Cheap non-blocking check, for FE clients that poll on their own cadence
 * instead of holding a long-poll connection open.
 */
router.get("/:sessionId/status", async (req, res) => {
  const { sessionId } = req.params;
  const result = await peekResult(sessionId);
  if (!result) return res.status(202).json({ status: "processing" });
  return res.status(200).json(result);
});

export default router;
