/**
 * Shared contract with the fraud-worker (FastAPI/Python) service.
 * Mirrored in /CONTRACT.md at the repo root — keep both in sync.
 */

export type IntakeType = "screenshot" | "text" | "call" | "app";

export interface FraudJob {
  sessionId: string;
  type: IntakeType;
  /** base64-encoded image bytes, no data: prefix. Present when type === "screenshot". */
  imageBase64?: string;
  imageMimeType?: string;
  /** pasted/forwarded message text. Present when type === "text". */
  text?: string;
  /** app name to check, used for both classification and the RBI lending-list lookup. */
  appName?: string;
  /** free-text description of a call (transcribed client-side via Web Speech API, or typed). */
  callDescription?: string;
  language?: string;
  createdAt: string;
}

export type Verdict = "likely_scam" | "likely_genuine" | "uncertain";

export interface FraudIndicator {
  label: string;
  detail: string;
}

export interface FraudResult {
  sessionId: string;
  verdict: Verdict;
  confidence: number; // 0..1
  indicators: FraudIndicator[];
  summary: string;
  actionList: string[];
  reportingScript?: string;
  lendingAppCheck?: {
    appName: string;
    matched: boolean;
    matchedEntry?: string;
    listLastUpdated?: string;
  };
  sources: string[];
  completedAt: string;
  error?: string;
}
