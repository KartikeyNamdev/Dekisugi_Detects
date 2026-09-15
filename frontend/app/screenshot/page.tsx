"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitAnalysis } from "@/lib/api";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function ScreenshotPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function selectFile(candidate: File | undefined | null) {
    if (!candidate) return;
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      setError("Please choose a JPEG, PNG, WEBP, or GIF image.");
      return;
    }
    setError(null);
    setFile(candidate);
    setPreviewUrl(URL.createObjectURL(candidate));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setSubmitting(true);
    setError(null);
    try {
      const { sessionId } = await submitAnalysis({
        type: "screenshot",
        screenshot: file,
      });
      router.push(`/result/${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div className="page-container">
      <h1>Upload a screenshot</h1>
      <p className="subtitle">
        Drag in or choose a screenshot of a message, app, or notification.
      </p>
      <form onSubmit={handleSubmit}>
        <div
          className={`dropzone${dragging ? " dragging" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            selectFile(e.dataTransfer.files[0]);
          }}
        >
          {file ? `Selected: ${file.name}` : "Drag a screenshot here, or click to choose a file"}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          hidden
          onChange={(e) => selectFile(e.target.files?.[0])}
        />
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Screenshot preview" className="preview-image" />
        )}
        <button type="submit" disabled={submitting || !file}>
          {submitting ? "Analyzing…" : "Check this screenshot"}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}
