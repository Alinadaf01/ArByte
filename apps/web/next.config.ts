import type { NextConfig } from "next";
import { apiOrigin } from "./src/lib/urls";

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
  // G-03 — سخت‌سازی: بدون MIME sniffing، بدون دسترسی به حسگرها/دوربین،
  // جداسازی پنجره‌ی باز‌شده از مبدأ دیگر.
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  images: {
    // بهینه‌سازی خودمیزبان با sharp (بدون سرویس ابری Vercel) — بند ۷.۱۶ و ۱۰.۵۶ برند بوک.
    formats: ["image/avif", "image/webp"],
    // T-201 — placeholderهای seed (T-150) خودشان SVG اند، اولین‌شخص و
    // خودمان تولیدشان کرده‌ایم (نه آپلود کاربر) — امن برای فعال‌سازی.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
  },
  // F-02 — تصاویری که از پنل ادمین آپلود می‌شوند (Django، WebP) مسیر نسبی
  // `/media/...` دارند؛ این rewrite آن‌ها را هم‌مبدأ از بک‌اند می‌آورد تا
  // next/image و CSP بدون دامنه‌ی خارجی کار کنند.
  // G-02 — Next 15 متادیتا را برای کاربرِ «غیربات» استریم و در <body> می‌گذارد؛
  // ابزارها/خزنده‌هایی که در فهرست پیش‌فرض بات Next نیستند (Lighthouse،
  // ترب، …) description را نمی‌دیدند. متادیتا همیشه در <head> رندر شود.
  htmlLimitedBots: /.*/,
  async rewrites() {
    // AUDIT-1 §12.8 — نرمال‌سازی و گارد تولید در lib/urls (نه نسخه‌ی جدا).
    const origin = apiOrigin();
    return [
      { source: "/media/:path*", destination: `${origin}/media/:path*` },
      // G-02 — فید ترب روی دامنه‌ی فروشگاه (arbyte.ir/feeds/torob)، ساخته‌شده در Django.
      { source: "/feeds/:path*", destination: `${origin}/feeds/:path*` },
    ];
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
