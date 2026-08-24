import type { NextConfig } from "next";

// ============================================================
// Content Security Policy
// 'unsafe-inline'/'unsafe-eval' для script-src требуются Next.js
// (инлайн-бутстрап + Turbopack HMR в dev-режиме)
// ============================================================
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' blob: data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // микрофон нужен для тренажёра произношения (ASR)
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
  // HSTS: только для HTTPS-деплоя (Caddy терминирует TLS)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["*.space-z.ai", "*.chatglm.cn", "*.z.ai"],
  async headers() {
    return [
      {
        // Security-заголовки для всех страниц приложения
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Явная CORS-политика для API.
        // ALLOWED_ORIGINS в .env — список разрешённых кросс-доменных
        // источников (через запятую). По умолчанию — только same-origin
        // (заголовки Access-Control-Allow-Origin не выдаются, браузер
        // блокирует кросс-доменные запросы с credentials).
        // Preflight OPTIONS обрабатывается в src/proxy.ts.
        source: "/api/:path*",
        headers: [
          { key: "Vary", value: "Origin" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-CSRF-Token, X-Admin-Token",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
