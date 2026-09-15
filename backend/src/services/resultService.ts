import { redis, redisSub } from "../config/redis";
import { env } from "../config/env";
import { resultChannel, resultKey, sessionKey } from "../queue/queueNames";
import type { FraudResult } from "../types/job";

export type WaitOutcome =
  | { status: "done"; result: FraudResult }
  | { status: "pending" };

/**
 * Waits for the worker to publish a result for `sessionId`, subscribing
 * to result:{sessionId} first so a publish can never land in the gap
 * between "check the key" and "start listening". On success, the result
 * key and the original session key are deleted immediately (zero
 * retention beyond the single response).
 */
export async function waitForResult(
  sessionId: string,
  timeoutMs: number = env.resultWaitTimeoutMs
): Promise<WaitOutcome> {
  const channel = resultChannel(sessionId);

  return new Promise((resolve, reject) => {
    let settled = false;

    const cleanupAndResolve = async (outcome: WaitOutcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      redisSub.off("message", onMessage);
      try {
        await redisSub.unsubscribe(channel);
      } catch {
        // best-effort; connection stays usable for other sessions either way
      }
      if (outcome.status === "done") {
        await redis.del(resultKey(sessionId), sessionKey(sessionId));
      }
      resolve(outcome);
    };

    const onMessage = (ch: string, message: string) => {
      if (ch !== channel) return;
      try {
        const result = JSON.parse(message) as FraudResult;
        void cleanupAndResolve({ status: "done", result });
      } catch (err) {
        reject(err);
      }
    };

    const timer = setTimeout(() => {
      void cleanupAndResolve({ status: "pending" });
    }, timeoutMs);

    redisSub.on("message", onMessage);

    redisSub
      .subscribe(channel)
      .then(() => redis.get(resultKey(sessionId)))
      .then((existing) => {
        if (existing) {
          const result = JSON.parse(existing) as FraudResult;
          void cleanupAndResolve({ status: "done", result });
        }
      })
      .catch((err) => {
        settled = true;
        clearTimeout(timer);
        redisSub.off("message", onMessage);
        reject(err);
      });
  });
}

/** Non-blocking check used by the FE's cheap poll before it commits to a long wait. */
export async function peekResult(sessionId: string): Promise<FraudResult | null> {
  const raw = await redis.get(resultKey(sessionId));
  if (!raw) return null;
  await redis.del(resultKey(sessionId), sessionKey(sessionId));
  return JSON.parse(raw) as FraudResult;
}
