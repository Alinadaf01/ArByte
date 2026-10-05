import type { PublicHomepageBlock } from "@arbyte/contracts";
import { categoriesPage, homeCategories } from "@arbyte/contracts";
import Link from "next/link";
import { CategoriesAccordionDesktop } from "./CategoriesAccordionDesktop";
import { CategoryTileContent } from "./CategoryTileContent";

interface CategoriesAccordionProps {
  block: Extract<PublicHomepageBlock, { type: "CATEGORY_GRID" }>;
}

/**
 * T-211 §۳ — بخش دسته‌ها. دسکتاپ آکاردئون پنج‌کاشی است (کامپوننت کلاینت
 * جدا، `CategoriesAccordionDesktop`)؛ موبایل طبق مقادیر واقعی محاسبه‌شده‌ی
 * `renderVals()` در `Home.dc.html` هیچ رفتار آکاردئونی ندارد — همه‌ی پنج
 * کاشی همیشه کامل باز نشان داده می‌شوند، پس نیازی به کلاینت/state نیست.
 */
export function CategoriesAccordion({ block }: CategoriesAccordionProps) {
  if (block.categories.length === 0) return null;

  return (
    <section
      data-section="categories"
      className="border-border border-t px-[5vw] py-14 md:py-20"
    >
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 className="text-h2 text-primary font-heading tracking-tight">
            {block.title ?? homeCategories.title}
          </h2>
          <p className="text-body text-secondary mt-2 hidden md:block">
            {homeCategories.subtitle}
          </p>
        </div>
        <Link
          href="/categories"
          className="text-body text-primary font-emphasis hover:text-brand"
        >
          {homeCategories.viewAll}
        </Link>
      </div>

      {/* موبایل — بدون آکاردئون، همه‌ی کاشی‌ها همیشه باز (ر.ک. کامنت بالا). */}
      <div className="flex flex-col gap-3 md:hidden">
        {block.categories.map((category) => (
          <Link
            key={category.id}
            href={`/category/${category.slug}`}
            className="relative flex aspect-[3/2] items-end overflow-hidden rounded-panel"
          >
            <CategoryTileContent
              category={category}
              productCountLabel={categoriesPage.productCount(
                category.productCount,
              )}
            />
          </Link>
        ))}
      </div>

      {/* دسکتاپ — آکاردئون پنج‌کاشی، hover/focus/click. */}
      <CategoriesAccordionDesktop categories={block.categories} />
    </section>
  );
}
