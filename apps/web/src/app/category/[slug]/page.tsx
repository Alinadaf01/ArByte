import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@arbyte/ui";
import { categoryDetailPage } from "@arbyte/contracts";
import { StorefrontShell } from "@/components/shell/StorefrontShell";
import { ShopControls } from "@/components/shop/ShopControls";
import { ShopProductGrid } from "@/components/shop/ShopProductGrid";
import { ProductGridSkeleton } from "@/components/category/ProductGridSkeleton";
import { parseShopParams } from "@/components/shop/shop-params";
import { computeShopRobotsAndCanonical } from "@/components/shop/shop-seo";
import {
  getCategoryBySlug,
  getFilters,
  getProducts,
  getTopLevelCategories,
} from "@/lib/catalog";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
  searchParams,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};

  const rawParams = await searchParams;
  const canonicalPath = category.seo.canonical ?? `/category/${slug}`;
  const { index, canonicalPath: canonical } = computeShopRobotsAndCanonical(
    rawParams,
    canonicalPath,
  );

  return {
    title: category.seo.title ?? category.name,
    description: category.seo.description ?? category.description ?? undefined,
    alternates: { canonical },
    robots: index ? undefined : { index: false, follow: true },
  };
}

/**
 * T-213 §۱/§۲ — `/category/[slug]`: همان زیرکامپوننت‌های `shop/` که
 * `/products` استفاده می‌کند، فقط با `category` از پیش تعیین‌شده. Breadcrumb
 * و `BreadcrumbList` JSON-LD از T-202 حفظ شده‌اند؛ زیرعنوان طبق §۲ همان
 * `category.description` است.
 */
export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;
  const rawParams = await searchParams;
  const filters = parseShopParams(rawParams);

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const [categories, filterData, countResult] = await Promise.all([
    getTopLevelCategories(),
    getFilters(slug),
    getProducts({
      category: slug,
      sort: filters.sort,
      page: filters.page,
      perPage: 1,
      brand: filters.brand,
      maxPrice: filters.maxPrice,
      inStock: filters.inStock,
      spec: filters.spec,
    }),
  ]);

  const breadcrumbItems = [
    { label: categoryDetailPage.breadcrumbHome, href: "/" },
    { label: categoryDetailPage.breadcrumbCategories, href: "/categories" },
    ...(category.parent
      ? [
          {
            label: category.parent.name,
            href: `/category/${category.parent.slug}`,
          },
        ]
      : []),
    { label: category.name },
  ];

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: item.href } : {}),
    })),
  };

  return (
    <StorefrontShell headerActive="categories" navActive="categories">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <section className="border-border border-b bg-surface px-[5vw] py-8 md:py-11">
        <Breadcrumb items={breadcrumbItems} className="mb-4" />
        <h1 className="text-hero text-primary font-heading tracking-tight">
          {category.name}
        </h1>
        {category.description ? (
          <p className="text-body text-secondary mt-2 max-w-[56ch]">
            {category.description}
          </p>
        ) : null}
      </section>

      <section className="px-[5vw] py-8 md:py-11">
        <ShopControls
          categories={categories}
          activeCategorySlug={category.slug}
          filters={filterData}
          resultCount={countResult.pagination.total}
        >
          <Suspense
            key={JSON.stringify(rawParams)}
            fallback={<ProductGridSkeleton />}
          >
            <ShopProductGrid
              category={slug}
              basePath={`/category/${slug}`}
              filters={filters}
            />
          </Suspense>
        </ShopControls>
      </section>
    </StorefrontShell>
  );
}
