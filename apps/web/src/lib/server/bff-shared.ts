import type { NextRequest } from "next/server";
import { env } from "@/lib/env";

/**
 * E-02 §۱ — ضد CSRF ساده روی Route Handlerهای نوشتنی: مرورگر روی هر fetch
 * غیر-GET همیشه هدر Origin می‌فرستد (چه هم‌مبدأ چه بین‌مبدأ) — نبودش یعنی
 * درخواست از مرورگر واقعی نیامده (curl/اسکریپت مستقیم)، رد می‌شود.
 */
export function isOriginAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(env.NEXT_PUBLIC_APP_URL).origin;
  } catch {
    return false;
  }
}

/**
 * G-02/G-03 — هدرهای مشترک هر درخواست BFF به Django: آی‌پی واقعی کاربر
 * (`X-Client-IP`، امضاشده با `X-BFF-Secret` = BFF_SHARED_SECRET) و
 * User-Agent. بدون این، همه‌ی کاربران یک آی‌پی (سرور Vercel) داشتند و
 * نرخ‌های per-IP سمت Django (OTP، فرم تماس) بین همه مشترک می‌شد.
 * بدون BFF_SHARED_SECRET هیچ هدری فرستاده نمی‌شود (Django هم نمی‌پذیرد).
 */
export function upstreamHeaders(
  request: Request,
  init?: Record<string, string>,
): Headers {
  const headers = new Headers(init);
  const ua = request.headers.get("user-agent");
  if (ua) headers.set("user-agent", ua.slice(0, 500));
  const secret = process.env.BFF_SHARED_SECRET;
  const ip =
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (secret && ip) {
    headers.set("x-client-ip", ip);
    headers.set("x-bff-secret", secret);
  }
  return headers;
}
