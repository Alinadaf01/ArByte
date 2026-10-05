import type { NextRequest } from "next/server";
import { ERROR_MESSAGES } from "@arbyte/contracts";
import { env } from "@/lib/env";
import {
  fetchWithTimeout,
  UPSTREAM_TIMEOUT_MS,
  UpstreamTimeoutError,
} from "@/lib/upstream-fetch";
import { serverApiUrl } from "@/lib/urls";

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

/**
 * AUDIT-1 §12.8/§12.9 — هر درخواست BFF به Django: آدرس از `lib/urls`
 * (نرمال‌شده) و سقف زمانی `UPSTREAM_TIMEOUT_MS.bff`.
 */
export function bffFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetchWithTimeout(
    serverApiUrl(path),
    { cache: "no-store", ...init },
    UPSTREAM_TIMEOUT_MS.bff,
  );
}

/**
 * Django کند یا در دسترس نیست → پاسخ JSON کنترل‌شده‌ی 504/502 با همان
 * قالب خطای API، به‌جای معلق‌ماندن تا سقف اجرای Vercel یا 500 خام.
 */
export function withUpstreamErrors<A extends unknown[]>(
  handler: (...args: A) => Promise<Response>,
): (...args: A) => Promise<Response> {
  return async (...args: A) => {
    try {
      return await handler(...args);
    } catch (error) {
      const timedOut = error instanceof UpstreamTimeoutError;
      console.error("[bff] upstream failure", error);
      return Response.json(
        {
          code: "SERVICE_UNAVAILABLE",
          message: ERROR_MESSAGES.SERVICE_UNAVAILABLE,
        },
        { status: timedOut ? 504 : 502 },
      );
    }
  };
}
