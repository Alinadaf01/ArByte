import Link from "next/link";
import { homePage } from "@arbyte/contracts";
import type { PublicHomepageBlock } from "@arbyte/contracts";

interface CategoryGridSectionProps {
  block: Extract<PublicHomepageBlock, { type: "CATEGORY_GRID" }>;
}

// T-201 §۴ — CategoryRefSchema فقط id/name/slug دارد، بدون تصویر (Category
// مدل `imageMain` دارد اما رزولوشن CATEGORY_GRID فعلاً آن را برنمی‌گرداند
// — ر.ک. گزارش برای فهرست تصاویر لازم). تا رسیدن عکس واقعی، هر کاشی یک
// گرادیان بنفش ثابت دارد، نه رنگ تصادفی — تفاوت بصری بین دسته‌ها فقط از
// طریق نام است.
export function CategoryGridSection({ block }: CategoryGridSectionProps) {
  if (block.categories.length === 0) return null;

  return (
    <section className="bg-surface border-border border-t px-[5vw] py-14 md:py-20">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <h2 className="text-h2 text-primary font-heading tracking-tight">
          {block.title ?? homePage.categoriesTitle}
        </h2>
        <Link
          href="/categories"
          className="text-body text-primary font-emphasis hover:text-brand"
        >
          {homePage.categoriesViewAll}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {block.categories.map((category) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            className="from-brand-tint-2 to-brand-tint-4 relative flex aspect-[3/4] items-end overflow-hidden rounded-panel bg-gradient-to-br p-4 transition-transform duration-200 hover:-translate-y-0.5"
          >
            <span className="text-card-title font-heading text-primary">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
