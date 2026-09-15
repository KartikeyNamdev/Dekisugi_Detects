"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/screenshot", label: "Screenshot" },
  { href: "/message", label: "Message" },
  { href: "/call", label: "Call" },
  { href: "/app-check", label: "App check" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="nav">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`nav-link${pathname === link.href ? " nav-link-active" : ""}`}
        >
          {link.label}
        </Link>
      ))}
      <Link
        href="/report"
        className={`nav-report${pathname === "/report" ? " nav-report-active" : ""}`}
      >
        Already scammed?
      </Link>
    </nav>
  );
}
