import Image from "next/image";
import Link from "next/link";
import { categoriesPage, formatNumberFa } from "@arbyte/contracts";
import type { CategoryCard as CategoryCardData } from "@arbyte/contracts";

interface CategoryCardProps {
  category: CategoryCardData;
  imageSizes?: string;
}

/** T-202 §۲.۱ / T-213 §۸ — کارت دسته‌بندی، صفحه‌ی `/categories` و گرید صفحه اصلی. */
export function CategoryCard({ category, imageSizes }: CategoryCardProps) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className="border-border hover:border-brand-tint-2 group flex flex-col overflow-hidden rounded-panel border bg-surface transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-popover"
    >
      <div className="bg-surface-muted relative aspect-[16/10] w-full">
        {category.image ? (
          <Image
            src={category.image.url}
            alt={category.image.alt ?? category.name}
            fill
            sizes={imageSizes ?? "(max-width: 768px) 100vw, 33vw"}
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-[19px]">
        <h3 className="text-card-title text-primary font-heading">
          {category.name}
        </h3>
        {category.description ? (
          <p className="text-caption text-secondary line-clamp-2">
            {category.description}
          </p>
        ) : null}
        <div className="border-border-divider mt-auto flex items-center justify-between gap-2.5 border-t pt-3">
          <span className="text-caption text-secondary">
            {categoriesPage.productCount(category.productCount)}
          </span>
          {category.minPrice !== null ? (
            <span className="text-caption text-brand font-emphasis">
              {categoriesPage.priceFromLabel(
                formatNumberFa(Math.round(category.minPrice / 1_000_000)),
              )}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
