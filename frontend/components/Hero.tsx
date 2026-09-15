"use client";

import Image from "next/image";
import Link from "next/link";
import { useScrollY } from "@/lib/useScrollProgress";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

export default function Hero() {
  const reduceMotion = usePrefersReducedMotion();
  const rawScrollY = useScrollY();
  const scrollY = reduceMotion ? 0 : rawScrollY;
  // Parallax + fade tuned against the hero's own height, not the whole
  // page, so it settles before the next section rather than dragging on.
  const fade = Math.max(1 - scrollY / 560, 0);
  const rise = Math.min(scrollY * 0.18, 90);

  return (
    <section className="hero">
      <span
        className="hero-blob hero-blob-1"
        style={{ transform: `translate3d(0, ${scrollY * 0.12}px, 0)` }}
        aria-hidden="true"
      />
      <span
        className="hero-blob hero-blob-2"
        style={{ transform: `translate3d(0, ${scrollY * -0.08}px, 0)` }}
        aria-hidden="true"
      />
      <div
        className="hero-inner"
        style={{
          opacity: fade,
          transform: `translate3d(0, ${-rise}px, 0)`,
        }}
      >
        <div className="hero-mascot-wrap">
          <Image
            src="/logo.jpeg"
            alt="Dekisugi Detects mascot"
            width={128}
            height={128}
            className="hero-mascot"
            priority
          />
        </div>
        <h1>Dekisugi Detects</h1>
        <p className="hero-tagline">
          Is this a scam? Paste a message, upload a screenshot, or describe a
          call — get a clear, explainable verdict and exactly what to do
          next. In under a minute.
        </p>
        <div className="hero-ctas">
          <Link href="/message" className="btn-lg">
            Check something now
          </Link>
          <a href="#how-it-works" className="btn-lg secondary">
            See how it works
          </a>
        </div>
        <div className="hero-badges">
          <span className="badge">🔒 Zero data retention</span>
          <span className="badge">🏦 RBI-verified list</span>
          <span className="badge">🌐 No signup required</span>
        </div>
      </div>
      <div className="hero-scroll-cue" aria-hidden="true">
        <span />
      </div>
    </section>
  );
}
