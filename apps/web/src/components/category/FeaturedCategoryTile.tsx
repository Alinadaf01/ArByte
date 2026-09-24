import Image from "next/image";
import Link from "next/link";
import { categoriesPage, formatNumberFa } from "@arbyte/contracts";
import type { CategoryCard as CategoryCardData } from "@arbyte/contracts";

interface FeaturedCategoryTileProps {
  category: CategoryCardData;
}

/**
 * T-213 §۸ — کارت بزرگ بالای `/categories`، هم‌تراز `Categories.dc.html`.
 * برچسب طراحی «پرفروش‌ترین دسته» ادعای فروش دارد که داده‌اش را نداریم؛
 * این نسخه دسته‌ی با بیشترین `productCount` را نشان می‌دهد — آمار واقعی،
 * نه ادعای فروش (ر.ک. QUESTIONS.md).
 */
export function FeaturedCategoryTile({ category }: FeaturedCategoryTileProps) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className="bg-surface-dark group grid overflow-hidden rounded-card-lg border border-transparent transition-transform duration-300 hover:-translate-y-1 sm:grid-cols-2"
    >
      <div className="bg-surface-dark relative min-h-55 sm:min-h-0">
        {category.image ? (
          <Image
            src={category.image.url}
            alt={category.image.alt ?? category.name}
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-contain p-8"
          />
        ) : null}
      </div>
      <div className="flex flex-col justify-center gap-3.5 p-6 md:p-9">
        <span className="text-on-dark self-start rounded-pill border border-white/14 bg-white/10 px-3.5 py-1.5 text-caption font-emphasis">
          {categoriesPage.featuredBadge}
        </span>
        <h2 className="text-on-dark text-card-title font-heading tracking-tight">
          {category.name}
        </h2>
        {category.description ? (
          <p className="text-on-dark-secondary text-body line-clamp-2 max-w-[44ch]">
            {category.description}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <span className="text-on-dark-secondary rounded-tile-sm border border-white/14 bg-white/[0.07] px-3 py-1.5 text-caption">
            {categoriesPage.productCount(category.productCount)}
          </span>
          {category.minPrice !== null ? (
            <span className="text-on-dark-secondary rounded-tile-sm border border-white/14 bg-white/[0.07] px-3 py-1.5 text-caption">
              {categoriesPage.priceFromLabel(
                formatNumberFa(Math.round(category.minPrice / 1_000_000)),
              )}
            </span>
          ) : null}
        </div>
        <span className="text-brand-on-dark mt-1 inline-flex items-center gap-2 text-caption font-emphasis">
          {categoriesPage.featuredCta}
        </span>
      </div>
    </Link>
  );
}
