import type { NextConfig } from "next";

// Cabeçalhos de segurança estáticos. A Content-Security-Policy é definida
// por requisição no middleware, porque usa um nonce.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // pdf.js carrega o próprio worker do disco no servidor; não deve ser empacotado.
  serverExternalPackages: ["pdfjs-dist"],
  experimental: { serverActions: { bodySizeLimit: "1mb" } },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
