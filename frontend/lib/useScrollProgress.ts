"use client";

import { useEffect, useState } from "react";
import type Lenis from "lenis";

/**
 * Reactive scroll position, in sync with Lenis when SmoothScroll has
 * initialized it, falling back to native `scroll` events otherwise (e.g.
 * reduced-motion visitors, or before Lenis mounts).
 */
export function useScrollY(): number {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const lenis = (window as typeof window & { __lenis?: Lenis }).__lenis;

    if (lenis) {
      const onScroll = ({ scroll }: { scroll: number }) => setScrollY(scroll);
      lenis.on("scroll", onScroll);
      return () => {
        lenis.off("scroll", onScroll);
      };
    }

    const onNativeScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onNativeScroll, { passive: true });
    onNativeScroll();
    return () => window.removeEventListener("scroll", onNativeScroll);
  }, []);

  return scrollY;
}
