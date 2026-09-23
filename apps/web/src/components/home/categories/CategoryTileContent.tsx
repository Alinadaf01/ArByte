import Image from "next/image";
import { homeCategories } from "@arbyte/contracts";
import type { CategoryCard } from "@arbyte/contracts";

interface CategoryTileContentProps {
  category: CategoryCard;
  productCountLabel: string;
  imageSizes?: string;
}

/**
 * محتوای «باز»ِ یک کاشی دسته — تصویر cover + اسکریم تیره + پیل تعداد
 * محصول + عنوان/زیرمتن + CTA. هم در نسخه‌ی موبایل (همیشه باز) و هم در
 * لایه‌ی expanded دسکتاپ استفاده می‌شود.
 */
export function CategoryTileContent({
  category,
  productCountLabel,
  imageSizes,
}: CategoryTileContentProps) {
  return (
    <>
      {category.image ? (
        <Image
          src={category.image.url}
          alt={category.image.alt ?? category.name}
          fill
          sizes={imageSizes ?? "(max-width: 768px) 100vw, 20vw"}
          className="object-cover"
        />
      ) : null}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-surface-dark/90 via-surface-dark/30 to-transparent"
      />
      <span className="text-caption text-on-dark bg-surface-dark/60 absolute end-4 top-4 rounded-pill px-3 py-1 backdrop-blur-sm">
        {productCountLabel}
      </span>
      <div className="relative flex flex-col items-start gap-1 p-5">
        <h3 className="text-card-title text-on-dark font-heading">
          {category.name}
        </h3>
        {category.description ? (
          <p className="text-caption text-on-dark-secondary line-clamp-1">
            {category.description}
          </p>
        ) : null}
        <span className="text-caption text-on-dark-secondary mt-1 font-emphasis underline-offset-4 group-hover:underline">
          {homeCategories.viewCategoryCta}
        </span>
      </div>
    </>
  );
}
