import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Is this a scam?",
  description: "Check a message, screenshot, call, or app for fraud indicators.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">
            Is this a scam?
          </Link>
          <Nav />
        </header>
        <main className="site-main">{children}</main>
      </body>
    </html>
  );
}
