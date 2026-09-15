import Link from "next/link";

const tiles = [
  {
    href: "/screenshot",
    title: "Screenshot",
    desc: "Upload or drag in a screenshot of a message or app.",
  },
  {
    href: "/message",
    title: "Message",
    desc: "Paste a forwarded SMS, WhatsApp, or email text.",
  },
  {
    href: "/call",
    title: "Call",
    desc: "Describe a suspicious call, typed or by voice.",
  },
  {
    href: "/app-check",
    title: "App check",
    desc: "Check a lending app against the RBI regulated-entity list.",
  },
];

export default function Home() {
  return (
    <div>
      <h1>Is this a scam?</h1>
      <p className="subtitle">
        Get an assessment in under a minute: verdict, indicators, and what to
        do next. Nothing you submit is stored beyond the session.
      </p>
      <div className="tile-grid">
        {tiles.map((tile) => (
          <Link key={tile.href} href={tile.href} className="tile">
            <div className="tile-title">{tile.title}</div>
            <div className="tile-desc">{tile.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
