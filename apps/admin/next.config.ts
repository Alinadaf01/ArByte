import type { NextConfig } from "next";

// ADR-002: هیچ قابلیت اختصاصی Vercel استفاده نشود. پنل ادمین هرگز نباید به
// دست مشتری برسد — باندل و دامنه‌اش کاملاً جدا از apps/web است (بند ۵.۸۱).
//
// Content-Security-Policy اینجا نیست — چون nonce نیاز به مقدار per-request
// دارد، در middleware.ts ساخته و تنظیم می‌شود (وگرنه یک script-src ثابت
// اسکریپت‌های داخلی خودِ Next.js را هم مسدود می‌کند و هیچ کامپوننت کلاینتی
// هیدریت نمی‌شود).
const securityHeaders = [
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
