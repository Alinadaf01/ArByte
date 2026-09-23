import Link from "next/link";
import { EmptyState } from "@arbyte/ui";
import {
  categoryDetailPage,
  searchEmptyState,
  type ProductSort,
} from "@arbyte/contracts";
import { ProductCard } from "@/components/product/ProductCard";
import { SortSelect } from "@/components/category/SortSelect";
import { ProductPagination } from "@/components/category/ProductPagination";
import { getProducts } from "@/lib/catalog";

const PER_PAGE = 24;
/** ردیف اول گرید — حداکثر ستون‌های ممکن طبق §۴ (موبایل۱/تبلت۲/دسکتاپ۳-۴). */
const PRIORITY_ROW_COUNT = 4;

interface CategoryProductGridProps {
  slug: string;
  sort: ProductSort;
  page: number;
}

/**
 * T-202 §۴ — عمداً از `page.tsx` جدا شده و در `<Suspense>` تودرتو می‌نشیند
 * (نه `loading.tsx` سطح مسیر): `loading.tsx` کل صفحه از‌جمله بررسی
 * `notFound()` دسته‌بندی در `page.tsx` را هم پشت Suspense می‌برد، یعنی
 * هدر HTTP قبل از مشخص‌شدن ۴۰۴ با کد ۲۰۰ فرستاده می‌شود (محدودیت streaming
 * خودِ Next.js) — کشف‌شده حین تأیید زنده‌ی «slug نامعتبر → ۴۰۴». با این
 * جداسازی، فقط واکشی محصولات (کند و صفحه‌بندی‌شده) پشت Suspense می‌رود؛
 * بررسی وجود دسته‌بندی در `page.tsx` قبل از هر Suspense اجرا می‌شود.
 */
export async function CategoryProductGrid({
  slug,
  sort,
  page,
}: CategoryProductGridProps) {
  const { items, pagination } = await getProducts({
    category: slug,
    sort,
    page,
    perPage: PER_PAGE,
  });

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (sort !== "newest") params.set("sort", sort);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return `/category/${slug}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <span className="text-caption text-secondary">
          {categoryDetailPage.resultCount(pagination.total)}
        </span>
        <SortSelect value={sort} />
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={searchEmptyState.title}
          description={searchEmptyState.description}
          action={
            <Link
              href={`/category/${slug}`}
              className="bg-primary text-on-dark rounded-pill px-5 py-2.5 text-caption font-emphasis"
            >
              {searchEmptyState.clearFiltersCta}
            </Link>
          }
        />
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
