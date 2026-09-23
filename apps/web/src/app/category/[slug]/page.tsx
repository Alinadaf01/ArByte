import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumb } from "@arbyte/ui";
import { categoryDetailPage, type ProductSort } from "@arbyte/contracts";
import { StorefrontShell } from "@/components/shell/StorefrontShell";
import { CategoryProductGrid } from "@/components/category/CategoryProductGrid";
import { ProductGridSkeleton } from "@/components/category/ProductGridSkeleton";
import { getCategoryBySlug } from "@/lib/catalog";

const SORT_VALUES: readonly ProductSort[] = [
  "newest",
  "price_asc",
  "price_desc",
  "popular",
];

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; page?: string }>;
}

function parseSort(raw: string | undefined): ProductSort {
  return SORT_VALUES.includes(raw as ProductSort)
    ? (raw as ProductSort)
    : "newest";
}

function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};

  return {
    title: category.seo.title ?? category.name,
    description: category.seo.description ?? category.description ?? undefined,
    // بند ۱۰.۷۱ — همیشه نسخه‌ی بدون پارامتر؛ صفحه‌ی ۲ و مرتب‌سازی نسخه‌ی
    // جداگانه ایندکس نمی‌شوند.
    alternates: { canonical: category.seo.canonical ?? `/category/${slug}` },
  };
}

/**
 * T-202 §۲.۲/§۳ — صفحه‌ی دسته‌بندی: breadcrumb، گرید محصول، صفحه‌بندی، سئو.
 * ⚠️ بررسی وجود دسته‌بندی (`notFound()`) عمداً قبل از هر `<Suspense>` است —
 * ر.ک. کامنت `CategoryProductGrid.tsx` برای چرایی (کد وضعیت HTTP واقعی).
 */
export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const sort = parseSort(query.sort);
  const page = parsePage(query.page);

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

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

        {category.children.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {category.children.map((child) => (
              <Link
                key={child.id}
                href={`/category/${child.slug}`}
                className="border-border hover:border-brand-tint-2 hover:text-brand rounded-pill border bg-surface px-4 py-2 text-caption text-primary transition-colors duration-200"
              >
                {child.name}
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <section className="px-[5vw] py-8 md:py-11">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
          {/* T-203 پنل فیلتر را اینجا پر می‌کند — عمداً خالی نگه داشته شده. */}
          <aside data-testid="filter-panel-slot" className="hidden lg:block" />

          <Suspense
            key={`${slug}-${sort}-${page}`}
            fallback={<ProductGridSkeleton />}
          >
            <CategoryProductGrid slug={slug} sort={sort} page={page} />
          </Suspense>
        </div>
      </section>
    </StorefrontShell>
  );
}
