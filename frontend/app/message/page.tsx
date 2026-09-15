"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitAnalysis } from "@/lib/api";

export default function MessagePage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const { sessionId } = await submitAnalysis({ type: "text", text });
      router.push(`/result/${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1>Paste a message</h1>
      <p className="subtitle">
        Paste a forwarded SMS, WhatsApp, or email message exactly as you
        received it.
      </p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="message-text">Message text</label>
        <textarea
          id="message-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Your KYC will expire today. Click here to update immediately..."
          required
        />
        <button type="submit" disabled={submitting || !text.trim()}>
          {submitting ? "Analyzing…" : "Check this message"}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}
