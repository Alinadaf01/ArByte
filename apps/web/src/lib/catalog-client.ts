import type { ProductCard, PublicProductDetail } from "@arbyte/contracts";
import { env } from "./env";

/**
 * T-215 §۱/§۳ — نسخه‌ی سمت مرورگر همان توابع `lib/catalog.ts` (که فقط از
 * RSC صدا زده می‌شوند و آدرس داخلی apps/api را می‌شناسند). `/wishlist`
 * شخصی/بدون ایندکس است، پس واکشی کلاینتی مجاز است (§۳ سند تسک)؛ سبد
 * افزودن دستگاه به `/compare` هم یک تعامل کاملاً کلاینتی است.
 */
const API_BASE = env.NEXT_PUBLIC_API_BASE_URL;

/** محصول حذف‌شده/غیرفعال → `null`، نه throw — صفحه نباید بشکند (§۳). */
export async function getProductBySlugClient(
  slug: string,
): Promise<PublicProductDetail | null> {
  try {
    const res = await fetch(
      `${API_BASE}/catalog/products/${encodeURIComponent(slug)}`,
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { data: PublicProductDetail };
    return body.data;
  } catch {
    return null;
  }
}

/** چند محصول موازی؛ حذف‌شده‌ها بی‌صدا فیلتر می‌شوند. */
export async function getProductsBySlugsClient(
  slugs: readonly string[],
): Promise<PublicProductDetail[]> {
  const results = await Promise.all(slugs.map(getProductBySlugClient));
  return results.filter((p): p is PublicProductDetail => p !== null);
}

export async function searchProductsClient(q: string): Promise<ProductCard[]> {
  if (!q.trim()) return [];
  try {
    const res = await fetch(
      `${API_BASE}/catalog/search?q=${encodeURIComponent(q)}&perPage=8`,
    );
    if (!res.ok) return [];
    const body = (await res.json()) as { data?: ProductCard[] };
    return body.data ?? [];
  } catch {
    return [];
  }
}
