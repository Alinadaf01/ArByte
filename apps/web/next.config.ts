import type { NextConfig } from "next";

// ADR-002: هیچ قابلیت اختصاصی Vercel استفاده نشود (نه Edge Middleware، نه
// Image Optimization ابری Vercel، نه Vercel KV/Blob/Postgres، نه Analytics).
// اپ باید مستقل و بدون وابستگی به پلتفرم خاصی روی هر سروری اجرا شود.
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // بهینه‌سازی خودمیزبان با sharp (بدون سرویس ابری Vercel) — بند ۷.۱۶ و ۱۰.۵۶ برند بوک.
    formats: ["image/avif", "image/webp"],
  },
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
