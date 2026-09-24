import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * تولید nonce برای CSP — بند ۱۱.۱۰۳ برند بوک.
 *
 * قبلاً `script-src 'self'` بدون nonce در next.config.ts بود که اسکریپت‌های
 * inline خودِ Next.js (bootstrap هیدریشن، داده‌ی جریان RSC) را هم مسدود
 * می‌کرد — یعنی هیچ کامپوننت کلاینتی در کل پروژه واقعاً هیدریت نمی‌شد. این
 * middleware استاندارد Next.js است (نه قابلیت اختصاصی Vercel — روی هر
 * میزبان Node.js کار می‌کند، طبق ADR-002) و یک nonce واقعی به هر درخواست
 * می‌دهد؛ Next.js خودش آن را به اسکریپت‌های داخلی‌اش اعمال می‌کند.
 */
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  // webpack دِو-مود Next.js (eval-source-map) به eval() نیاز دارد؛ بدون
  // 'unsafe-eval' در dev کل باندل کلاینت silently شکست می‌خورد (هیچ خطای
  // قابل‌مشاهده‌ای هم نیست). فقط در dev اضافه می‌شود، در production نه.
  const scriptSrc =
    process.env.NODE_ENV === "production"
      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`;
  // T-215 §۳ — `/wishlist` و انتخابگر «افزودن دستگاه» در `/compare` عمداً
  // سمت کلاینت به apps/api صدا می‌زنند (صفحه‌ی شخصی/تعامل زنده، نه RSC).
  // بدون این، `connect-src 'self'` هر fetch را بی‌صدا با «Failed to fetch»
  // مسدود می‌کرد (بدون هیچ خطای قابل‌مشاهده‌ای در network لاگ) — همان الگوی
  // خطای ADR-005 (مسدودشدن بی‌صدا)، این‌بار برای fetch نه hydration.
  // apps/api زیرساخت خودِ ما است (بند ۸ فقط دامنه‌ی خارجی را منع می‌کند).
  const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_BASE_URL!).origin;
  const cspHeader = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${apiOrigin}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", cspHeader);
  return response;
}

export const config = {
  // بدون runtime صریح: پیش‌فرض middleware در Next.js همین Edge Runtime خودِ
  // فریم‌ورک است (محیط اجرای سبک داخل خودِ باینری Next.js) — محصول اختصاصی
  // Vercel نیست؛ با `next start` روی هر سرور Node.js (طبق ADR-002) عین همین
  // اجرا می‌شود. runtime: "nodejs" صریح بدون فلگ experimental باعث می‌شد
  // Next.js کل middleware را بی‌صدا نادیده بگیرد.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts/).*)"],
};
