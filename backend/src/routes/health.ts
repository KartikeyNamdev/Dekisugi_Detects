import { Router } from "express";
import { redis } from "../config/redis";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    await redis.ping();
    res.status(200).json({ status: "ok", redis: "ok" });
  } catch {
    res.status(503).json({ status: "degraded", redis: "unreachable" });
  }
});

export default router;
