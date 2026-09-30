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
    const apiBase =
      process.env.API_INTERNAL_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      (process.env.NODE_ENV === "production"
        ? undefined
        : "http://localhost:8000/api/v1");
    if (!apiBase) {
      throw new Error(
        "Set API_INTERNAL_URL or NEXT_PUBLIC_API_BASE_URL for production builds.",
      );
    }
    if (
      process.env.VERCEL === "1" &&
      process.env.VERCEL_ENV === "production" &&
      apiBase !== "https://api.arbyte.ir/api/v1"
    ) {
      throw new Error(
        "Production API URLs must be https://api.arbyte.ir/api/v1.",
      );
    }
    const apiOrigin = apiBase.replace(/\/api\/v1\/?$/, "");
    return [
      { source: "/media/:path*", destination: `${apiOrigin}/media/:path*` },
      // G-02 — فید ترب روی دامنه‌ی فروشگاه (arbyte.ir/feeds/torob)، ساخته‌شده در Django.
      { source: "/feeds/:path*", destination: `${apiOrigin}/feeds/:path*` },
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
