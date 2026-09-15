import type {
  AnalyzeAcceptedResponse,
  FraudResult,
  LendingCheckResponse,
} from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

async function parseJsonOrThrow(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 202) {
    throw new Error(body?.error ?? `Request failed with status ${res.status}`);
  }
  return body;
}

export interface AnalyzePayload {
  type: "screenshot" | "text" | "call" | "app";
  text?: string;
  appName?: string;
  callDescription?: string;
  language?: string;
  screenshot?: File;
}

export async function submitAnalysis(
  payload: AnalyzePayload
): Promise<AnalyzeAcceptedResponse> {
  const form = new FormData();
  form.set("type", payload.type);
  if (payload.text) form.set("text", payload.text);
  if (payload.appName) form.set("appName", payload.appName);
  if (payload.callDescription) form.set("callDescription", payload.callDescription);
  if (payload.language) form.set("language", payload.language);
  if (payload.screenshot) form.set("screenshot", payload.screenshot);

  const res = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: "POST",
    body: form,
  });
  return parseJsonOrThrow(res);
}

/**
 * Long-polls the backend for a result. The backend itself holds each
 * request open for ~25s and returns 202 on timeout, so this loops calls
 * to it until a result (or an error) comes back.
 */
export async function pollAnalysisResult(
  sessionId: string,
  { maxAttempts = 6, signal }: { maxAttempts?: number; signal?: AbortSignal } = {}
): Promise<FraudResult> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(`${API_BASE_URL}/api/analyze/${sessionId}/result`, {
      signal,
    });
    if (res.status === 200) {
      return res.json();
    }
    if (res.status !== 202) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? `Request failed with status ${res.status}`);
    }
    // 202 processing — loop again immediately, the backend already waited.
  }
  throw new Error("Timed out waiting for a result. Please try again.");
}

export async function checkLendingApp(
  appName: string
): Promise<LendingCheckResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/lending-check?appName=${encodeURIComponent(appName)}`
  );
  return parseJsonOrThrow(res);
}
