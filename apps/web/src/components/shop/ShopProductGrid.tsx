import Link from "next/link";
import { EmptyState } from "@arbyte/ui";
import { productsPage } from "@arbyte/contracts";
import type { ProductSort } from "@arbyte/contracts";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductPagination } from "@/components/category/ProductPagination";
import { getProducts } from "@/lib/catalog";
import type { ShopFilterState } from "./shop-params";

const PER_PAGE = 24;
const PRIORITY_ROW_COUNT = 4;

interface ShopProductGridProps {
  category?: string;
  basePath: string;
  filters: ShopFilterState;
}

/**
 * T-213 §۲/§۳ — گرید محصولات فروشگاه/دسته. سرور-رندرشده (بند §۴: «نه
 * واکشی سمت کلاینت») — تغییر فیلتر یعنی navigation واقعی، این کامپوننت
 * دوباره از صفر روی سرور اجرا می‌شود.
 */
export async function ShopProductGrid({
  category,
  basePath,
  filters,
}: ShopProductGridProps) {
  const { items, pagination } = await getProducts({
    category,
    sort: filters.sort,
    page: filters.page,
    perPage: PER_PAGE,
    brand: filters.brand,
    maxPrice: filters.maxPrice,
    inStock: filters.inStock,
    spec: filters.spec,
  });

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (filters.brand.length > 0) params.set("brand", filters.brand.join(","));
    if (filters.maxPrice !== undefined)
      params.set("maxPrice", String(filters.maxPrice));
    if (filters.inStock) params.set("inStock", "1");
    for (const [id, value] of Object.entries(filters.spec)) {
      params.set(`spec[${id}]`, value);
    }
    if (filters.sort !== ("featured" satisfies ProductSort))
      params.set("sort", filters.sort);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };

  if (items.length === 0) {
    return (
      <EmptyState
        title={productsPage.emptyTitle}
        description={productsPage.emptyDescription}
        action={
          <Link
            href={basePath}
            className="bg-primary text-on-dark rounded-pill px-5 py-2.5 text-caption font-emphasis"
          >
            {productsPage.emptyCta}
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            priority={index < PRIORITY_ROW_COUNT}
            imageSizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ))}
      </div>

      <ProductPagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        buildHref={buildHref}
      />
    </div>
  );
}
