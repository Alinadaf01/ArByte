import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/json-ld";

export const revalidate = 3600;

interface SitemapData {
  products: { slug: string; updatedAt: string }[];
  categories: { slug: string; updatedAt: string }[];
  posts: { slug: string; updatedAt: string }[];
}

const API_INTERNAL_BASE =
  process.env.API_INTERNAL_URL ?? "http://localhost:8000/api/v1";

async function getSitemapData(): Promise<SitemapData> {
  try {
    const res = await fetch(`${API_INTERNAL_BASE}/seo/sitemap`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(String(res.status));
    return ((await res.json()) as { data: SitemapData }).data;
  } catch {
    return { products: [], categories: [], posts: [] };
  }
}

/**
 * G-02 — sitemap پویا: صفحه‌های ثابت، دسته‌ها، محصولات فعال و نوشته‌ها با
 * lastmod از دیتابیس. تا ~۴۵هزار آدرس در یک فایل می‌ماند (سقف ۵۰هزار
 * پروتکل)؛ بزرگ‌تر شد → `generateSitemaps` (docs/reports/G-02.md).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getSitemapData();
  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/products"), changeFrequency: "daily", priority: 0.9 },
    {
      url: absoluteUrl("/categories"),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    { url: absoluteUrl("/blog"), changeFrequency: "weekly", priority: 0.6 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.4 },
    { url: absoluteUrl("/support"), changeFrequency: "monthly", priority: 0.4 },
    { url: absoluteUrl("/legal"), changeFrequency: "monthly", priority: 0.3 },
  ];
  return [
    ...staticPages,
    ...data.categories.map((c) => ({
      url: absoluteUrl(`/category/${c.slug}`),
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...data.products.map((p) => ({
      url: absoluteUrl(`/products/${p.slug}`),
      lastModified: p.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...data.posts.map((p) => ({
      url: absoluteUrl(`/blog/${p.slug}`),
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
