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

// مرورگر همیشه به مبدأ خودِ پنل (`NEXT_PUBLIC_API_BASE_URL`) فراخوانی می‌زند؛
// این rewrite همان مسیر را سمت سرور به apps/api واقعی پروکسی می‌کند — یعنی
// کلاینت هرگز یک مبدأ دیگر نمی‌بیند و نیازی به CORS در تولید هم نیست
// (بند ۸: بدون درخواست به دامنه‌ی خارجی — apps/api هم زیرساخت اول‌شخص خودمان است).
const API_INTERNAL_URL =
  process.env.API_INTERNAL_URL ?? "http://localhost:4000";

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
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_INTERNAL_URL}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
