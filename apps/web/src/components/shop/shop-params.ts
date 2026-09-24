import type { ProductSort } from "@arbyte/contracts";

const SORT_VALUES: readonly ProductSort[] = [
  "featured",
  "price_asc",
  "price_desc",
  "newest",
];

export interface ShopFilterState {
  brand: string[];
  maxPrice: number | undefined;
  inStock: boolean;
  spec: Record<string, string>;
  sort: ProductSort;
  page: number;
}

/**
 * T-213 §۴ — URL تنها منبع حقیقت. این تابع خالص هر جای دیگری (سرور یا
 * کلاینت) با یک `URLSearchParams` یکسان صدا زده می‌شود تا همیشه یک تفسیر
 * وجود داشته باشد.
 */
export function parseShopParams(
  params: Record<string, string | string[] | undefined>,
): ShopFilterState {
  const get = (key: string): string | undefined => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const brandRaw = get("brand");
  const brand = brandRaw ? brandRaw.split(",").filter(Boolean) : [];

  const maxPriceRaw = get("maxPrice");
  const maxPrice =
    maxPriceRaw && Number.isFinite(Number(maxPriceRaw))
      ? Number(maxPriceRaw)
      : undefined;

  const spec: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    const match = /^spec\[(.+)\]$/.exec(key);
    if (match?.[1] && typeof value === "string") spec[match[1]] = value;
  }

  const sortRaw = get("sort");
  const sort = SORT_VALUES.includes(sortRaw as ProductSort)
    ? (sortRaw as ProductSort)
    : "featured";

  const pageRaw = Number(get("page"));
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  return {
    brand,
    maxPrice,
    inStock: get("inStock") === "1",
    spec,
    sort,
    page,
  };
}

/**
 * یک تغییر فیلتر را روی `URLSearchParams` موجود اعمال می‌کند و رشته‌ی
 * کوئری جدید را برمی‌گرداند. طبق §۴: هر تغییر فیلتر `page` را حذف می‌کند
 * (یعنی صفحه‌ی ۱) — به‌جز وقتی خودِ `page` در حال تغییر است.
 */
export function withFilterUpdate(
  current: URLSearchParams,
  updates: Record<string, string | null>,
  { resetPage = true }: { resetPage?: boolean } = {},
): string {
  const next = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
  }
  if (resetPage) next.delete("page");
  // پیش‌فرض‌ها در URL نوشته نمی‌شوند (§۶) — sort=featured یعنی همان صفحه‌ی بدون پارامتر.
  if (next.get("sort") === "featured") next.delete("sort");
  return next.toString();
}

/**
 * T-213 §۱ — چیپ دسته یک لینک واقعی است؛ همه‌ی فیلترهای دیگر (برند/قیمت/
 * موجودی/مرتب‌سازی) حفظ می‌شوند، فقط `page` و `spec[...]` حذف می‌شوند
 * (مشخصات فنی بین دسته‌ها متفاوت است، حفظش معنی ندارد).
 */
export function buildCategorySwitchHref(
  rawParams: Record<string, string | string[] | undefined>,
  targetPath: string,
): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(rawParams)) {
    if (key === "page" || key.startsWith("spec[")) continue;
    const v = Array.isArray(value) ? value[0] : value;
    if (v !== undefined && v !== "") next.set(key, v);
  }
  const qs = next.toString();
  return `${targetPath}${qs ? `?${qs}` : ""}`;
}

export function toggleInArray(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

export function countActiveFilters(state: ShopFilterState): number {
  return (
    state.brand.length +
    (state.maxPrice !== undefined ? 1 : 0) +
    (state.inStock ? 1 : 0) +
    Object.keys(state.spec).length
  );
}
