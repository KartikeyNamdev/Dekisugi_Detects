import Link from "next/link";
import Reveal from "@/components/Reveal";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";

const features = [
  {
    icon: "🔍",
    title: "Multi-modal intake",
    desc: "A screenshot, a pasted message, an app name, or a spoken description of a call — whatever you have is enough to start.",
  },
  {
    icon: "🧠",
    title: "Explainable verdict",
    desc: "Not just a label — a confidence score and the specific indicators found: urgency, OTP requests, unofficial links, impersonation cues.",
  },
  {
    icon: "⚡",
    title: "Act in the next 10 minutes",
    desc: "A concrete do-this-now list, plus a ready-to-read script for the 1930 helpline and the National Cybercrime Reporting Portal.",
  },
  {
    icon: "🏦",
    title: "RBI-verified lending check",
    desc: "Cross-checked against the Reserve Bank of India's own directory of digital lending apps deployed by regulated entities.",
  },
];

const steps = [
  {
    title: "Submit",
    desc: "Paste a message, drop in a screenshot, or describe a call in your own words.",
  },
  {
    title: "Analyze",
    desc: "Checked against a fraud taxonomy and a library of genuine bank, utility, and courier formats.",
  },
  {
    title: "Act",
    desc: "Get a clear verdict, the reasons behind it, and exactly what to do next.",
  },
];

const tools = [
  {
    href: "/screenshot",
    icon: "🖼️",
    title: "Screenshot",
    desc: "Upload or drag in a screenshot of a message or app.",
  },
  {
    href: "/message",
    icon: "💬",
    title: "Message",
    desc: "Paste a forwarded SMS, WhatsApp, or email text.",
  },
  {
    href: "/call",
    icon: "📞",
    title: "Call",
    desc: "Describe a suspicious call, typed or by voice.",
  },
  {
    href: "/app-check",
    icon: "✅",
    title: "App check",
    desc: "Check a lending app against the RBI regulated-entity list.",
  },
];

export default function Home() {
  return (
    <div>
      <Hero />
      <Marquee />

      {/* Features */}
      <section className="section">
        <div className="section-inner">
          <Reveal>
            <div className="section-head">
              <span className="eyebrow">Why it works</span>
              <h2>Built for the moment of decision</h2>
              <p>
                Public warnings are generic. This is specific to what you
                just received.
              </p>
            </div>
          </Reveal>
          <div className="feature-grid">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <div className="feature-card">
                  <div className="feature-icon">{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section" id="how-it-works">
        <div className="section-inner">
          <Reveal>
            <div className="section-head">
              <span className="eyebrow">How it works</span>
              <h2>Three steps, under a minute</h2>
            </div>
          </Reveal>
          <div className="steps">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 100}>
                <div className="step">
                  <div className="step-number">{i + 1}</div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Tools */}
      <section className="section section-alt">
        <div className="section-inner">
          <Reveal>
            <div className="section-head">
              <span className="eyebrow">Get started</span>
              <h2>Pick what you have</h2>
              <p>Nothing you submit is stored beyond the session.</p>
            </div>
          </Reveal>
          <div className="tool-grid">
            {tools.map((t, i) => (
              <Reveal key={t.href} delay={i * 80}>
                <Link href={t.href} className="tool-card">
                  <span className="tool-icon">{t.icon}</span>
                  <h3>{t.title}</h3>
                  <p>{t.desc}</p>
                  <span className="tool-cta">Check now →</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section">
        <div className="section-inner">
          <Reveal>
            <div className="cta-band">
              <h2>Got a suspicious message right now?</h2>
              <p>Don&apos;t wait. A quick check takes less time than reading this page did.</p>
              <Link href="/message" className="btn-lg">
                Check it now
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
