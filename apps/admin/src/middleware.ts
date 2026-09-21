import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * تولید nonce برای CSP — بند ۱۱.۱۰۳ برند بوک.
 *
 * قبلاً `script-src 'self'` بدون nonce در next.config.ts بود که اسکریپت‌های
 * inline خودِ Next.js (bootstrap هیدریشن، daten جریان RSC) را هم مسدود می‌کرد
 * — یعنی هیچ کامپوننت کلاینتی در کل پروژه واقعاً هیدریت نمی‌شد (هیچ رخدادی
 * کار نمی‌کرد، فقط HTML استاتیک نمایش داده می‌شد). این middleware استاندارد
 * Next.js (نه قابلیت اختصاصی Vercel — روی هر میزبان Node.js کار می‌کند،
 * طبق ADR-002) یک nonce واقعی به هر درخواست می‌دهد و Next.js خودش آن را به
 * اسکریپت‌های داخلی‌اش اعمال می‌کند.
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
  const cspHeader = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
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
  // فریم‌ورک است (یک محیط اجرای سبک داخل خودِ باینری Next.js) — این محصول
  // اختصاصی Vercel نیست؛ با `next start` روی هر سرور Node.js (از جمله لیارا/
  // داکر خودمیزبان طبق ADR-002) عین همین‌طور اجرا می‌شود. تنظیم صریح
  // runtime: "nodejs" بدون فعال‌سازی فلگ experimental باعث می‌شد Next.js
  // کل middleware را بی‌صدا نادیده بگیرد (هیچ «Compiling /middleware» در لاگ
  // نبود) — دقیقاً همان چیزی که این middleware قرار بود حل کند.
  matcher: [
    // همه‌ی مسیرها به‌جز فایل‌های استاتیک/تصویر — الگوی رسمی مستندات Next.js
    "/((?!_next/static|_next/image|favicon.ico|fonts/|brand/).*)",
  ],
};
