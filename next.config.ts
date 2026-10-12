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
  // O worker do pdf.js é carregado por import dinâmico; garante que vá junto no deploy.
  outputFileTracingIncludes: {
    "/editais": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
    "/editais/[id]": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
  experimental: { serverActions: { bodySizeLimit: "1mb" } },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
