import type {
  AboutContent,
  BlogCategory,
  BlogPostCard,
  BlogPostDetail,
  FaqItem,
  LegalDocument,
  PaginationMeta,
  PublicHomepageBlock,
  SiteInfo,
} from "@arbyte/contracts";
import { fetchWithTimeout, UPSTREAM_TIMEOUT_MS } from "@/lib/upstream-fetch";
import { serverApiUrl } from "@/lib/urls";

/**
 * فقط سمت سرور (RSC) صدا زده می‌شود — همان الگوی `getCategoryTree` در
 * catalog.ts (T-200): اگر API در دسترس نبود یا خالی برگشت، صفحه نباید
 * بشکند، فقط بخش‌های مبتنی بر بلوک رندر نمی‌شوند.
 */

export async function getHomepage(): Promise<PublicHomepageBlock[]> {
  try {
    const res = await fetchWithTimeout(
      serverApiUrl(`/content/homepage`),
      {
        next: { revalidate: 60 },
      },
      UPSTREAM_TIMEOUT_MS.rsc,
      1,
    );
    if (!res.ok) return [];
    const body = (await res.json()) as {
      data?: { blocks?: PublicHomepageBlock[] };
    };
    return body.data?.blocks ?? [];
  } catch {
    return [];
  }
}

async function getJson<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetchWithTimeout(
      serverApiUrl(`${path}`),
      {
        next: { revalidate },
      },
      UPSTREAM_TIMEOUT_MS.rsc,
      1,
    );
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface BlogListParams {
  category?: BlogCategory;
  q?: string;
  page?: number;
  perPage?: number;
}

/** G-01 — فهرست نوشته‌های منتشرشده؛ API در دسترس نبود = فهرست خالی. */
export async function getBlogPosts(
  params: BlogListParams = {},
): Promise<{ items: BlogPostCard[]; pagination: PaginationMeta | null }> {
  const qs = new URLSearchParams();
  if (params.category) qs.set("category", params.category);
  if (params.q) qs.set("q", params.q);
  if (params.page) qs.set("page", String(params.page));
  if (params.perPage) qs.set("perPage", String(params.perPage));
  const body = await getJson<{
    data?: BlogPostCard[];
    meta?: { pagination?: PaginationMeta };
  }>(`/blog${qs.size ? `?${qs}` : ""}`);
  return {
    items: body?.data ?? [],
    pagination: body?.meta?.pagination ?? null,
  };
}

export async function getBlogPost(
  slug: string,
): Promise<BlogPostDetail | null> {
  const body = await getJson<{ data: BlogPostDetail }>(
    `/blog/${encodeURIComponent(slug)}`,
  );
  return body?.data ?? null;
}

export async function getAboutContent(): Promise<AboutContent | null> {
  return (
    (await getJson<{ data: AboutContent }>("/content/about"))?.data ?? null
  );
}

/** سوالات متداول از پنل؛ خطای شبکه → فهرست خالی (بخش پنهان، صفحه نمی‌شکند). */
export async function getFaq(): Promise<FaqItem[]> {
  return (await getJson<{ data: FaqItem[] }>("/content/faq", 300))?.data ?? [];
}

export async function getLegalDocuments(): Promise<LegalDocument[]> {
  return (
    (await getJson<{ data: LegalDocument[] }>("/content/legal"))?.data ?? []
  );
}

const EMPTY_SITE_INFO: SiteInfo = {
  phone: null,
  email: null,
  address: null,
  businessHours: [],
  socials: {},
  trustBadge: null,
};

/** G-01 — تماس/شبکه‌ها/نماد از SiteSettings؛ API در دسترس نبود = همه پنهان. */
export async function getSiteInfo(): Promise<SiteInfo> {
  return (
    (await getJson<{ data: SiteInfo }>("/content/site-info", 300))?.data ??
    EMPTY_SITE_INFO
  );
}
