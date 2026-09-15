"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Site-wide momentum smooth-scroll. A no-op when the visitor has asked for
 * reduced motion — native scroll behaves normally in that case.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
    });

    let frame: number;
    function raf(time: number) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    }
    frame = requestAnimationFrame(raf);

    // Expose for other client components that want scroll progress/parallax
    // without each spinning up their own Lenis instance.
    (window as typeof window & { __lenis?: Lenis }).__lenis = lenis;

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      delete (window as typeof window & { __lenis?: Lenis }).__lenis;
    };
  }, []);

  return null;
}
