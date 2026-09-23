import type { PublicHomepageBlock } from "@arbyte/contracts";

/**
 * فقط سمت سرور (RSC) صدا زده می‌شود — همان الگوی `getCategoryTree` در
 * catalog.ts (T-200): اگر API در دسترس نبود یا خالی برگشت، صفحه نباید
 * بشکند، فقط بخش‌های مبتنی بر بلوک رندر نمی‌شوند.
 */
const API_INTERNAL_BASE =
  process.env.API_INTERNAL_URL ?? "http://localhost:4000/api/v1";

export async function getHomepage(): Promise<PublicHomepageBlock[]> {
  try {
    const res = await fetch(`${API_INTERNAL_BASE}/content/homepage`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as {
      data?: { blocks?: PublicHomepageBlock[] };
    };
    return body.data?.blocks ?? [];
  } catch {
    return [];
  }
}
