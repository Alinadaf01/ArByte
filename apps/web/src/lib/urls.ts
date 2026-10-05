/**
 * AUDIT-1 §12.8 — تنها جای ساختن/نرمال‌کردن آدرس‌های پایه‌ی فروشگاه و API.
 *
 * قبلاً هر فایل خودش `process.env.API_INTERNAL_URL ?? …` و گارد تولید را
 * تکرار می‌کرد (۵ نسخه) و آدرس‌ها با `${base}/${path}` چسبانده می‌شدند؛
 * یک `/` اضافه در env یعنی `//catalog/...` و یک `/` کم یعنی `v1catalog`.
 *
 * بدون وابستگی (نه zod، نه next/*) تا در next.config، middleware (Edge)،
 * Route Handler و RSC یکسان import شود.
 */

/** آدرس‌های تولیدی (تصمیم استقرار، docs/DEPLOY.md). */
export const PRODUCTION_APP_URL = "https://arbyte.ir";
export const PRODUCTION_API_BASE_URL = "https://api.arbyte.ir/api/v1";

const DEV_APP_URL = "http://localhost:3000";
const DEV_API_BASE_URL = "http://localhost:8000/api/v1";

/** پایه‌ی مطلق http(s) بدون اسلش انتهایی؛ ورودی نامعتبر = خطا. */
export function normalizeBaseUrl(value: string, name = "URL"): string {
  const trimmed = value.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`${name} must be an absolute http(s) URL, got "${value}".`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${name} must use http or https, got "${value}".`);
  }
  if (url.search || url.hash) {
    throw new Error(`${name} must not contain a query or hash.`);
  }
  const path = url.pathname.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  return `${url.origin}${path}`;
}

/** `joinUrl("https://x/api/v1/", "/catalog?q=1")` → `https://x/api/v1/catalog?q=1` */
export function joinUrl(base: string, path: string): string {
  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");
  return cleanPath ? `${cleanBase}/${cleanPath}` : cleanBase;
}

function isVercelProduction(): boolean {
  return process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production";
}

function resolve(
  name: string,
  raw: string | undefined,
  devDefault: string,
  productionValue: string,
): string {
  if (!raw) {
    // پیش‌فرض localhost فقط بیرون از build/اجرای تولیدی (dev و تست).
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `Set ${name} for production builds (apps/web/.env.example).`,
      );
    }
    return devDefault;
  }
  const base = normalizeBaseUrl(raw, name);
  if (isVercelProduction() && base !== productionValue) {
    throw new Error(`Production ${name} must be ${productionValue}.`);
  }
  return base;
}

/** آدرس فروشگاه (canonical، OG، بررسی Origin). */
export function appBaseUrl(): string {
  return resolve(
    "NEXT_PUBLIC_APP_URL",
    process.env.NEXT_PUBLIC_APP_URL,
    DEV_APP_URL,
    PRODUCTION_APP_URL,
  );
}

/** پایه‌ی API برای مرورگر (فقط جاهایی که عمداً مستقیم صدا می‌زنند). */
export function publicApiBaseUrl(): string {
  return resolve(
    "NEXT_PUBLIC_API_BASE_URL",
    process.env.NEXT_PUBLIC_API_BASE_URL,
    DEV_API_BASE_URL,
    PRODUCTION_API_BASE_URL,
  );
}

/** پایه‌ی API برای سمت سرور (RSC، BFF، middleware، rewrites). */
export function serverApiBaseUrl(): string {
  if (process.env.API_INTERNAL_URL) {
    return resolve(
      "API_INTERNAL_URL",
      process.env.API_INTERNAL_URL,
      DEV_API_BASE_URL,
      PRODUCTION_API_BASE_URL,
    );
  }
  return publicApiBaseUrl();
}

/** آدرس کامل یک endpoint سمت سرور: `serverApiUrl("/catalog/products?x=1")`. */
export function serverApiUrl(path: string): string {
  return joinUrl(serverApiBaseUrl(), path);
}

/** origin سرور API (بدون `/api/v1`) — برای rewrite `/media` و CSP. */
export function apiOrigin(): string {
  return new URL(serverApiBaseUrl()).origin;
}

/** آدرس مطلق یک مسیر فروشگاه. */
export function absoluteUrl(path: string): string {
  return new URL(path, `${appBaseUrl()}/`).toString();
}
