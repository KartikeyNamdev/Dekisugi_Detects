import type { NextConfig } from "next";

// "standalone" output is only for the self-hosted Docker build
// (frontend/Dockerfile) — Vercel has its own optimized build/output
// handling for Next.js and explicitly recommends against "standalone"
// there. Vercel sets its own VERCEL env var during builds, so skip it then.
const nextConfig: NextConfig = {
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
};

export default nextConfig;
