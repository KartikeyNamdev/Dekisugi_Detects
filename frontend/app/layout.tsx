import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Nav from "@/components/Nav";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollProgress from "@/components/ScrollProgress";
import PageTransition from "@/components/PageTransition";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dekisugi Detects",
  description:
    "Is this a scam? Paste a message, upload a screenshot, or describe a call — get an instant, explainable fraud verdict and exactly what to do next.",
  icons: { icon: "/logo.jpeg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <SmoothScroll />
        <ScrollProgress />
        <header className="site-header">
          <Link href="/" className="brand">
            <Image
              src="/logo.jpeg"
              alt="Dekisugi Detects"
              width={36}
              height={36}
              className="brand-logo"
              priority
            />
            <span>Dekisugi Detects</span>
          </Link>
          <Nav />
        </header>
        <main className="site-main">
          <PageTransition>{children}</PageTransition>
        </main>
        <footer className="site-footer">
          <p>
            Dekisugi Detects is an advisory tool — it doesn&apos;t report on
            your behalf or contact your bank. If money has already moved,
            call <a href="tel:1930">1930</a> or visit{" "}
            <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">
              cybercrime.gov.in
            </a>{" "}
            immediately —{" "}
            <Link href="/report">see the full checklist →</Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
