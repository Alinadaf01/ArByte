import type { CategoryTreeNode } from "@arbyte/contracts";

/**
 * فقط سمت سرور (RSC) صدا زده می‌شود — بدون مرورگر، پس نیازی به CORS/rewrite
 * نیست؛ مستقیم به apps/api داخلی وصل می‌شود. §۳.۱ سند T-200: اگر API در
 * دسترس نبود یا خالی برگشت، منو خالی می‌ماند نه اینکه صفحه بشکند.
 */
const API_INTERNAL_BASE =
  process.env.API_INTERNAL_URL ?? "http://localhost:4000/api/v1";

export async function getCategoryTree(): Promise<CategoryTreeNode[]> {
  try {
    const res = await fetch(`${API_INTERNAL_BASE}/catalog/categories`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { data?: CategoryTreeNode[] };
    return body.data ?? [];
  } catch {
    return [];
  }
}
