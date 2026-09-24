import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumb } from "@arbyte/ui";
import { formatNumberFa, productsPage } from "@arbyte/contracts";
import { StorefrontShell } from "@/components/shell/StorefrontShell";
import { ShopControls } from "@/components/shop/ShopControls";
import { ShopProductGrid } from "@/components/shop/ShopProductGrid";
import { ProductGridSkeleton } from "@/components/category/ProductGridSkeleton";
import { parseShopParams } from "@/components/shop/shop-params";
import { computeShopRobotsAndCanonical } from "@/components/shop/shop-seo";
import { getFilters, getProducts, getTopLevelCategories } from "@/lib/catalog";

interface ProductsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  searchParams,
}: ProductsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const { index, canonicalPath } = computeShopRobotsAndCanonical(
    params,
    "/products",
  );
  return {
    title: `${productsPage.title} | آربایت`,
    description: productsPage.subtitle,
    alternates: { canonical: canonicalPath },
    robots: index ? undefined : { index: false, follow: true },
  };
}

/**
 * T-213 §۱/§۲ — «فروشگاه آربایت»، همه‌ی دسته‌ها. یک کامپوننت صفحه با
 * `/category/[slug]` مشترک نیست (دو فایل route جدا طبق ساختار Next.js)
 * ولی همان زیرکامپوننت‌های `shop/` را صدا می‌زند — منطق فیلتر یک‌بار
 * نوشته شده.
 */
export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const rawParams = await searchParams;
  const filters = parseShopParams(rawParams);

  const [categories, filterData, countResult] = await Promise.all([
    getTopLevelCategories(),
    getFilters(undefined),
    getProducts({
      sort: filters.sort,
      page: filters.page,
      perPage: 1,
      brand: filters.brand,
      maxPrice: filters.maxPrice,
      inStock: filters.inStock,
      spec: filters.spec,
    }),
  ]);

  return (
    <StorefrontShell headerActive="products" navActive="">
      <section className="border-border border-b bg-surface px-[5vw] py-8 md:py-11">
        <Breadcrumb
          items={[
            { label: productsPage.breadcrumbHome, href: "/" },
            { label: productsPage.breadcrumbShop },
          ]}
          className="mb-4"
        />
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <h1 className="text-hero text-primary font-heading tracking-tight">
              {productsPage.title}
            </h1>
            <p className="text-body text-secondary mt-2 max-w-[56ch]">
              {productsPage.subtitle}
            </p>
          </div>
          <p className="text-caption text-secondary whitespace-nowrap">
            <span className="text-primary font-emphasis">
              {formatNumberFa(countResult.pagination.total)}
            </span>{" "}
            {productsPage.deviceLabel}
          </p>
        </div>
      </section>

      <section className="px-[5vw] py-8 md:py-11">
        <ShopControls
          categories={categories}
          activeCategorySlug={null}
          filters={filterData}
          resultCount={countResult.pagination.total}
        >
          <Suspense
            key={JSON.stringify(rawParams)}
            fallback={<ProductGridSkeleton />}
          >
            <ShopProductGrid basePath="/products" filters={filters} />
          </Suspense>
        </ShopControls>
      </section>
    </StorefrontShell>
  );
}
