import { randomUUID } from "crypto";
import { redis } from "../config/redis";
import { env } from "../config/env";
import { JOB_LIST_KEY, sessionKey } from "../queue/queueNames";
import type { FraudJob } from "../types/job";

export function newSessionId(): string {
  return randomUUID();
}

/**
 * Persists the job under session:{id} with a TTL (zero-retention safety net)
 * and pushes it onto the plain-Redis job list for the worker to BLPOP.
 * The worker is language-agnostic by design: any process that can BLPOP
 * fraud:jobs and speak JSON can consume it (see /CONTRACT.md).
 */
export async function enqueueJob(job: FraudJob): Promise<void> {
  const payload = JSON.stringify(job);
  await redis
    .multi()
    .set(sessionKey(job.sessionId), payload, "EX", env.sessionTtlSeconds)
    .rpush(JOB_LIST_KEY, payload)
    .exec();
}

export async function deleteSession(sessionId: string): Promise<void> {
  await redis.del(sessionKey(sessionId));
}
