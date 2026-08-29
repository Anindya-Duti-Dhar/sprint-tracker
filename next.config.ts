import type { NextConfig } from "next";

// Baseline security headers (Phase 10 hardening). Kept conservative — no CSP
// here, since MUI's runtime style injection and the app's own inline SVG/data
// usage would need careful nonce/hash wiring to avoid breaking the UI; the
// headers below are the safe, no-downside wins.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
