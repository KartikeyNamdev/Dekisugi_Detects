const items = [
  "ZERO DATA RETENTION",
  "RBI-VERIFIED LENDING LIST",
  "CLAUDE VISION SCREENSHOT CHECK",
  "1930 CYBERCRIME HELPLINE",
  "UNDER A MINUTE",
  "ADVISORY ONLY",
];

export default function Marquee() {
  const track = [...items, ...items];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {track.map((item, i) => (
          <span className="marquee-item" key={i}>
            {item}
            <span className="marquee-dot">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
