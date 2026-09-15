// Minimal typings for the (still non-standard) Web Speech API — not in
// TypeScript's default DOM lib. Only the bits this app uses.

export interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

export interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Cheap support check — no instance allocation, safe to call on every render. */
export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

/**
 * Client-side transcription only — raw audio never leaves the device.
 * Returns null when the browser doesn't support the API (notably Firefox
 * and most non-Chromium browsers).
 */
export function getSpeechRecognition(): SpeechRecognitionLike | null {
  const Ctor = getSpeechRecognitionCtor();
  return Ctor ? new Ctor() : null;
}
