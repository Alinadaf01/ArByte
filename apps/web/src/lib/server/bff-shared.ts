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
