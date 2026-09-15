// Mirrors backend/src/types/job.ts and /CONTRACT.md — keep in sync.

export type Verdict = "likely_scam" | "likely_genuine" | "uncertain";

export interface FraudIndicator {
  label: string;
  detail: string;
}

export interface LendingAppCheck {
  appName: string;
  matched: boolean;
  matchedEntry?: string;
  listLastUpdated?: string | null;
}

export interface FraudResult {
  sessionId: string;
  verdict: Verdict;
  confidence: number;
  indicators: FraudIndicator[];
  summary: string;
  actionList: string[];
  reportingScript?: string;
  lendingAppCheck?: LendingAppCheck;
  sources: string[];
  completedAt: string;
  error?: string;
}

export interface AnalyzeAcceptedResponse {
  sessionId: string;
  status: "processing";
}

export interface LendingCheckResponse {
  appName: string;
  matched: boolean;
  matchedEntry?: string;
  listLastUpdated: string | null;
  listSource: string;
}
