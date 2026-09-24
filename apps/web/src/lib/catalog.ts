import type {
  CatalogFiltersData,
  CategoryCard,
  CategoryDetail,
  CategoryTreeNode,
  PaginationMeta,
  ProductCard,
  ProductSort,
} from "@arbyte/contracts";

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

/** T-202 §۱.۱ — صفحه‌ی `/categories`. */
export async function getTopLevelCategories(): Promise<CategoryCard[]> {
  try {
    const res = await fetch(
      `${API_INTERNAL_BASE}/catalog/categories/top-level`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return [];
    const body = (await res.json()) as { data?: CategoryCard[] };
    return body.data ?? [];
  } catch {
    return [];
  }
}

/**
 * T-202 §۱.۲ — صفحه‌ی `/category/[slug]`. برخلاف بقیه‌ی توابع این فایل،
 * عمداً خطا را قورت نمی‌دهد به `[]`/`null` ساکت — تفاوت بین «۴۰۴ واقعی» و
 * «API موقتاً در دسترس نیست» برای `notFound()` صفحه مهم است؛ فراخوان با
 * try/catch خودش تصمیم می‌گیرد.
 */
export async function getCategoryBySlug(
  slug: string,
): Promise<CategoryDetail | null> {
  const res = await fetch(
    `${API_INTERNAL_BASE}/catalog/categories/${encodeURIComponent(slug)}`,
    { next: { revalidate: 60 } },
  );
  if (res.status === 404) return null;
  if (!res.ok)
    throw new Error(`GET /catalog/categories/${slug} → ${res.status}`);
  const body = (await res.json()) as { data: CategoryDetail };
  return body.data;
}

export interface ProductListParams {
  category?: string;
  sort?: ProductSort;
  page?: number;
  perPage?: number;
  /** T-213 §۳ — چندانتخابی؛ به `brand=a,b` سریالایز می‌شود. */
  brand?: string[];
  maxPrice?: number;
  inStock?: boolean;
  spec?: Record<string, string>;
}

const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  perPage: 24,
  total: 0,
  totalPages: 0,
};

/** T-202 §۲.۲ / T-213 §۳ — گرید محصولات فروشگاه/دسته، همه‌ی فیلترها از URL. */
export async function getProducts(
  params: ProductListParams,
): Promise<{ items: ProductCard[]; pagination: PaginationMeta }> {
  const qs = new URLSearchParams();
  if (params.category) qs.set("category", params.category);
  if (params.sort) qs.set("sort", params.sort);
  if (params.page) qs.set("page", String(params.page));
  if (params.perPage) qs.set("perPage", String(params.perPage));
  if (params.brand && params.brand.length > 0)
    qs.set("brand", params.brand.join(","));
  if (params.maxPrice !== undefined)
    qs.set("maxPrice", String(params.maxPrice));
  if (params.inStock) qs.set("availability", "IN_STOCK");
  if (params.spec) {
    for (const [id, value] of Object.entries(params.spec)) {
      qs.set(`spec[${id}]`, value);
    }
  }

  try {
    const res = await fetch(`${API_INTERNAL_BASE}/catalog/products?${qs}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return { items: [], pagination: EMPTY_PAGINATION };
    const body = (await res.json()) as {
      data?: ProductCard[];
      meta?: { pagination?: PaginationMeta };
    };
    return {
      items: body.data ?? [],
      pagination: body.meta?.pagination ?? EMPTY_PAGINATION,
    };
  } catch {
    return { items: [], pagination: EMPTY_PAGINATION };
  }
}

const EMPTY_FILTERS: CatalogFiltersData = {
  specs: [],
  priceRange: { min: 0, max: 0 },
  brands: [],
  conditions: [],
};

/** T-213 §۳ — `category` اختیاری: نبودش یعنی `/products` (کل کاتالوگ). */
export async function getFilters(
  category?: string,
): Promise<CatalogFiltersData> {
  const qs = new URLSearchParams();
  if (category) qs.set("category", category);

  try {
    const res = await fetch(`${API_INTERNAL_BASE}/catalog/filters?${qs}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return EMPTY_FILTERS;
    const body = (await res.json()) as { data?: CatalogFiltersData };
    return body.data ?? EMPTY_FILTERS;
  } catch {
    return EMPTY_FILTERS;
  }
}
