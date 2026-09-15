"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { submitAnalysis } from "@/lib/api";
import {
  getSpeechRecognition,
  isSpeechRecognitionSupported,
  type SpeechRecognitionLike,
} from "@/lib/speech";

const noopSubscribe = () => () => {};

export default function CallPage() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [recording, setRecording] = useState(false);
  // Feature detection needs to read `window`, which only exists on the
  // client — useSyncExternalStore is the React-sanctioned way to do that
  // without a server/client hydration mismatch.
  const speechSupported = useSyncExternalStore(
    noopSubscribe,
    isSpeechRecognitionSupported,
    () => false
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef("");

  function startRecording() {
    const recognition = getSpeechRecognition();
    if (!recognition) return;
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;
    baseTextRef.current = description ? description.trim() + " " : "";

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setDescription((baseTextRef.current + transcript).trim());
    };
    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    setRecording(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const { sessionId } = await submitAnalysis({
        type: "call",
        callDescription: description,
      });
      router.push(`/result/${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div className="page-container">
      <h1>Describe a call</h1>
      <p className="subtitle">
        Type or speak what happened on the call — who called, what they
        asked for, and any pressure tactics used. Voice is transcribed
        entirely on your device; the audio itself is never uploaded.
      </p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="call-description">Call description</label>
        <div className="record-row">
          {speechSupported ? (
            <button
              type="button"
              className="secondary"
              onClick={recording ? stopRecording : startRecording}
            >
              {recording ? "Stop recording" : "🎤 Record"}
            </button>
          ) : (
            <span className="record-indicator">
              Voice input isn&apos;t supported in this browser — please type instead.
            </span>
          )}
          {recording && <span className="record-indicator">● Listening…</span>}
        </div>
        <textarea
          id="call-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A caller said they were from my bank and asked me to share the OTP I just received to 'verify my KYC'..."
          required
        />
        <button type="submit" disabled={submitting || !description.trim()}>
          {submitting ? "Analyzing…" : "Check this call"}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}
