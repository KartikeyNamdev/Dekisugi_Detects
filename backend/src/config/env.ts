import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  redisUrl: required("REDIS_URL", "redis://localhost:6379"),
  sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS ?? 300),
  resultTtlSeconds: Number(process.env.RESULT_TTL_SECONDS ?? 120),
  resultWaitTimeoutMs: Number(process.env.RESULT_WAIT_TIMEOUT_MS ?? 25000),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 8 * 1024 * 1024),
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
};
