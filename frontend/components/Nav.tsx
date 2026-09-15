import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/screenshot", label: "Screenshot" },
  { href: "/message", label: "Message" },
  { href: "/call", label: "Call" },
  { href: "/app-check", label: "App check" },
];

export default function Nav() {
  return (
    <nav className="nav">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="nav-link">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
