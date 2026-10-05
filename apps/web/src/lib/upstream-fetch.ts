/**
 * AUDIT-1 §12.9 — هر درخواست Vercel → سرور ایران سقف زمانی دارد.
 *
 * ریشه‌ی «timeout BFF»: هیچ fetch بالادستی (middleware، `/api/proxy`، RSC)
 * timeout نداشت؛ وقتی مسیر Vercel ↔ ایران کند می‌شد، درخواست تا سقف
 * اجرای Vercel معلق می‌ماند و کاربر صفحه‌ی خطای Vercel می‌دید. حالا هر
 * لایه بودجه‌ی خودش را دارد و به‌جایش خطای کنترل‌شده برمی‌گرداند.
 */
export const UPSTREAM_TIMEOUT_MS = {
  /** middleware روی مسیر هر صفحه است: هرگز بیشتر از این منتظر جدول ریدایرکت نمی‌ماند. */
  middleware: 1500,
  /** واکشی RSC (کاتالوگ، محتوا): شکست = حالت خالی، نه صفحه‌ی معلق. */
  rsc: 8000,
  /** پراکسی BFF (سبد، تسویه، حساب، آپلود رسید). */
  bff: 15000,
} as const;

export class UpstreamTimeoutError extends Error {
  constructor(url: string, ms: number) {
    super(`Upstream ${url} did not respond within ${ms}ms`);
    this.name = "UpstreamTimeoutError";
  }
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit & { next?: { revalidate?: number | false } },
  timeoutMs: number,
): Promise<Response> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeout])
    : timeout;
  try {
    return await fetch(url, { ...init, signal });
  } catch (error) {
    if (timeout.aborted) throw new UpstreamTimeoutError(url, timeoutMs);
    throw error;
  }
}
