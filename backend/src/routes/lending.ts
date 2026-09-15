import { Router } from "express";
import { checkLendingApp } from "../services/lendingList";

const router = Router();

/** GET /api/lending-check?appName=... */
router.get("/", (req, res) => {
  const appName = String(req.query.appName ?? "").trim();
  if (!appName) {
    return res.status(400).json({ error: "missing_app_name" });
  }
  try {
    const result = checkLendingApp(appName);
    return res.status(200).json(result);
  } catch (err) {
    console.error("[lending-check] failed", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
