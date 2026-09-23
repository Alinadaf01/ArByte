"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { categoriesPage, formatNumberFa } from "@arbyte/contracts";
import type { CategoryCard } from "@arbyte/contracts";
import { CategoryTileContent } from "./CategoryTileContent";

interface CategoriesAccordionDesktopProps {
  categories: CategoryCard[];
}

/**
 * T-211 §۳ — آکاردئون پنج‌کاشی دسکتاپ، پورت‌شده از منطق واقعی
 * `renderVals()` در Home.dc.html: کاشی فعال `flex-grow:4`، بقیه `1`؛
 * باز شدن با hover/focus/click؛ دو لایه‌ی هم‌پوشان (expanded/collapsed)
 * که فقط با opacity جابه‌جا می‌شوند، نه رندر شرطی.
 */
export function CategoriesAccordionDesktop({
  categories,
}: CategoriesAccordionDesktopProps) {
  const [active, setActive] = useState(0);

  return (
    <div
      className="hidden gap-3 md:flex"
      style={{ height: "clamp(340px, 52vh, 520px)" }}
    >
      {categories.map((category, i) => {
        const isActive = active === i;
        return (
          <Link
            key={category.id}
            href={`/category/${category.slug}`}
            aria-label={`${category.name} — ${categoriesPage.productCount(category.productCount)}`}
            className="group relative overflow-hidden rounded-panel transition-[flex-grow] duration-300 ease-out"
            style={{ flexGrow: isActive ? 4 : 1, flexBasis: 0 }}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
          >
            {/* لایه‌ی expanded — کاشی فعال. */}
            <div
              className="absolute inset-0 transition-opacity duration-300"
              style={{ opacity: isActive ? 1 : 0 }}
              aria-hidden={!isActive}
            >
              <CategoryTileContent
                category={category}
                productCountLabel={categoriesPage.productCount(
                  category.productCount,
                )}
                imageSizes="40vw"
              />
            </div>

            {/* لایه‌ی collapsed — کاشی‌های غیرفعال: شماره + برچسب عمودی. */}
            <div
              className="bg-surface-dark/70 absolute inset-0 flex flex-col items-center justify-between p-4 transition-opacity duration-300"
              style={{ opacity: isActive ? 0 : 1 }}
              aria-hidden={isActive}
            >
              {category.image ? (
                <Image
                  src={category.image.url}
                  alt=""
                  aria-hidden="true"
                  fill
                  sizes="10vw"
                  className="-z-10 object-cover opacity-50"
                />
              ) : null}
              <span className="text-caption text-on-dark-secondary font-emphasis">
                {formatNumberFa(i + 1).padStart(2, "۰")}
              </span>
              <span className="text-caption text-on-dark [writing-mode:vertical-rl] font-emphasis">
                {category.name}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
