import Image from "next/image";
import Link from "next/link";
import { homePage } from "@arbyte/contracts";
import type { PublicHomepageBlock } from "@arbyte/contracts";

interface CategoryGridSectionProps {
  block: Extract<PublicHomepageBlock, { type: "CATEGORY_GRID" }>;
}

/** T-202 §۱.۱ — حالا `CategoryCardSchema` است، با تصویر واقعی. */
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
            // T-201 اشتباهاً "/categories/:slug" ساخته بود — URL درست طبق
            // T-004/T-202 §۳ همین «/category/:slug» مفرد است.
            href={`/category/${category.slug}`}
            className="from-brand-tint-2 to-brand-tint-4 relative flex aspect-[3/4] items-end overflow-hidden rounded-panel bg-gradient-to-br transition-transform duration-200 hover:-translate-y-0.5"
          >
            {category.image ? (
              <Image
                src={category.image.url}
                alt={category.image.alt ?? category.name}
                fill
                sizes="(max-width: 768px) 50vw, 20vw"
                className="object-cover"
              />
            ) : null}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-surface-dark/85 via-surface-dark/20 to-transparent"
            />
            <span className="text-card-title font-heading text-on-dark relative p-4">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
