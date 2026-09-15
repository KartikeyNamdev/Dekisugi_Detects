"use client";

import { useSyncExternalStore } from "react";

const query = "(prefers-reduced-motion: reduce)";
const noopSubscribe = () => () => {};

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
    () => false
  );
}
