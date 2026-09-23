import Image from "next/image";
import Link from "next/link";
import { categoriesPage } from "@arbyte/contracts";
import type { CategoryCard as CategoryCardData } from "@arbyte/contracts";

interface CategoryCardProps {
  category: CategoryCardData;
  imageSizes?: string;
}

/** T-202 §۲.۱ — کارت دسته‌بندی، صفحه‌ی `/categories` و گرید صفحه اصلی. */
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
      <div className="flex flex-1 flex-col gap-2 p-[19px]">
        <h3 className="text-card-title text-primary font-heading">
          {category.name}
        </h3>
        <span className="text-caption text-secondary mt-auto">
          {categoriesPage.productCount(category.productCount)}
        </span>
      </div>
    </Link>
  );
}
