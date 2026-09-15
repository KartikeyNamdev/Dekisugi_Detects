"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { pollAnalysisResult } from "@/lib/api";
import type { FraudResult } from "@/lib/types";
import ResultCard from "@/components/ResultCard";

// Keyed by sessionId at the call site below, so a new session always mounts
// fresh (null) state instead of needing a manual reset inside the effect.
function ResultView({ sessionId }: { sessionId: string }) {
  const [result, setResult] = useState<FraudResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    pollAnalysisResult(sessionId, { signal: controller.signal })
      .then(setResult)
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Something went wrong.");
      });

    return () => controller.abort();
  }, [sessionId]);

  return (
    <>
      {!result && !error && (
        <p className="status">Analyzing — this usually takes a few seconds…</p>
      )}
      {error && <p className="error">{error}</p>}
      {result && <ResultCard result={result} />}
    </>
  );
}

export default function ResultPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);

  return (
    <div>
      <h1>Result</h1>
      <ResultView key={sessionId} sessionId={sessionId} />
      <p style={{ marginTop: "1.5rem" }}>
        <Link href="/">← Check something else</Link>
      </p>
    </div>
  );
}
