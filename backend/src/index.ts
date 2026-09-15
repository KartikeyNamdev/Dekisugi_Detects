import express from "express";
import cors from "cors";
import { env } from "./config/env";
import analyzeRouter from "./routes/analyze";
import lendingRouter from "./routes/lending";
import healthRouter from "./routes/health";

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: "1mb" }));

app.use("/api/health", healthRouter);
app.use("/api/analyze", analyzeRouter);
app.use("/api/lending-check", lendingRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[unhandled]", err);
  res.status(500).json({ error: "internal_error" });
});

app.listen(env.port, () => {
  console.log(`Backend listening on port ${env.port}`);
});
