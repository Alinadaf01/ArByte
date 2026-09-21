import type { NextConfig } from "next";

// ADR-002: هیچ قابلیت اختصاصی Vercel استفاده نشود (نه Vercel Edge Middleware
// (محصول اختصاصی Vercel با قفل زیرساخت)، نه Image Optimization ابری Vercel،
// نه Vercel KV/Blob/Postgres، نه Analytics). middleware.ts کنار همین فایل،
// middleware استاندارد خودِ Next.js است (نه محصول Vercel) و صریحاً با
// runtime: 'nodejs' روی هر سرور Node.js اجرا می‌شود — نه فقط Vercel.
// اپ باید مستقل و بدون وابستگی به پلتفرم خاصی روی هر سروری اجرا شود.
//
// Content-Security-Policy اینجا نیست — nonce به مقدار per-request نیاز دارد،
// پس در middleware.ts ساخته و تنظیم می‌شود (وگرنه یک script-src ثابت
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
