"use client";

import { useState } from "react";
import { checkLendingApp } from "@/lib/api";
import type { LendingCheckResponse } from "@/lib/types";

export default function AppCheckPage() {
  const [appName, setAppName] = useState("");
  const [result, setResult] = useState<LendingCheckResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!appName.trim()) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await checkLendingApp(appName.trim());
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1>Check a lending app</h1>
      <p className="subtitle">
        Check whether an app name appears on the Reserve Bank of India&apos;s
        published list of digital lending apps deployed by regulated
        entities.
      </p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="app-name">App name</label>
        <input
          id="app-name"
          type="text"
          value={appName}
          onChange={(e) => setAppName(e.target.value)}
          placeholder="e.g. QuickCash Loans"
          required
        />
        <button type="submit" disabled={submitting || !appName.trim()}>
          {submitting ? "Checking…" : "Check app"}
        </button>
        {error && <p className="error">{error}</p>}
      </form>

      {result && (
        <div className="card">
          <div
            className={
              result.matched ? "verdict verdict-genuine" : "verdict verdict-uncertain"
            }
          >
            {result.matched ? "Found on the regulated-entity list" : "Not found on the list"}
          </div>
          <p>
            <strong>{result.appName}</strong>
            {result.matched && result.matchedEntry
              ? ` matched against "${result.matchedEntry}".`
              : " was not found among the regulated entities RBI has published."}
          </p>
          {!result.matched && (
            <p className="subtitle">
              This doesn&apos;t automatically mean the app is fraudulent — the
              list may be incomplete — but treat unlisted lending apps with
              extra caution, especially if they ask for excessive contact or
              storage permissions.
            </p>
          )}
          <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            Source: {result.listSource}
            {result.listLastUpdated ? ` — last updated ${result.listLastUpdated}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
