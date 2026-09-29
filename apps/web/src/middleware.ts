import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";

/**
 * G-02 — ریدایرکت‌های پنل (و خودکارِ تغییر slug/حذف محصول). جدول کامل هر
 * ۶۰ ثانیه از API گرفته و در حافظه‌ی همین نمونه نگه داشته می‌شود؛ API در
 * دسترس نبود = بدون ریدایرکت (صفحه نمی‌شکند). شمارش بازدید بعد از پاسخ.
 */
interface RedirectRule {
  id: string;
  from: string;
  to: string;
  status: number;
}
const REDIRECT_TTL_MS = 60_000;
let redirectTable: { at: number; map: Map<string, RedirectRule> } | null = null;
let redirectLoading: Promise<Map<string, RedirectRule>> | null = null;

function apiBase(): string {
  return process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL!;
}

async function loadRedirects(): Promise<Map<string, RedirectRule>> {
  if (redirectTable && Date.now() - redirectTable.at < REDIRECT_TTL_MS) {
    return redirectTable.map;
  }
  redirectLoading ??= (async () => {
    try {
      const res = await fetch(`${apiBase()}/seo/redirects`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { data: RedirectRule[] };
      const map = new Map(body.data.map((r) => [r.from, r]));
      redirectTable = { at: Date.now(), map };
      return map;
    } catch {
      return redirectTable?.map ?? new Map<string, RedirectRule>();
    } finally {
      redirectLoading = null;
    }
  })();
  return redirectLoading;
}

function normalizePath(pathname: string): string {
  let path = pathname;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    /* مسیر خراب: همان خام */
  }
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

const SKIP_REDIRECT = /^\/(api|_next|media|feeds)\b/;

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
export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  if (
    !SKIP_REDIRECT.test(pathname) &&
    (request.method === "GET" || request.method === "HEAD")
  ) {
    const rule = (await loadRedirects()).get(normalizePath(pathname));
    if (rule) {
      const target = rule.to.startsWith("http")
        ? new URL(rule.to)
        : new URL(rule.to, request.url);
      if (!rule.to.startsWith("http")) target.search = request.nextUrl.search;
      event.waitUntil(
        fetch(`${apiBase()}/seo/redirects/${rule.id}/hit`, {
          method: "POST",
        }).catch(() => undefined),
      );
      return NextResponse.redirect(target, rule.status === 302 ? 302 : 301);
    }
  }

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
    // G-01 — نماد اعتماد اینماد باید مستقیم از سرور خودش بارگذاری شود.
    "img-src 'self' data: blob: https://trustseal.enamad.ir",
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
