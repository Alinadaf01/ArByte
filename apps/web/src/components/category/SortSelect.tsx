"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { VisuallyHidden } from "@arbyte/ui";
import { categoryDetailPage } from "@arbyte/contracts";
import type { ProductSort } from "@arbyte/contracts";

const SORT_VALUES: ProductSort[] = [
  "popular",
  "price_asc",
  "price_desc",
  "newest",
];

interface SortSelectProps {
  value: ProductSort;
}

/**
 * T-202 §۲.۳ — مرتب‌سازی در URL (`?sort=`)، قابل اشتراک‌گذاری و با دکمه‌ی
 * back مرورگر درست برمی‌گردد چون خودِ URL تغییر می‌کند، نه فقط state
 * محلی. تغییر مرتب‌سازی همیشه به صفحه‌ی ۱ برمی‌گردد (نتایج فرق می‌کنند).
 * ظاهر: ردیف دکمه‌ی چیپ طبق مرجع طراحی `Products.dc.html` (نه `<select>`).
 */
export function SortSelect({ value }: SortSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleSortChange(sort: ProductSort) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", sort);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div
      role="group"
      aria-label={categoryDetailPage.sortLabel}
      className="flex flex-wrap gap-1.5"
    >
      <VisuallyHidden>{categoryDetailPage.sortLabel}</VisuallyHidden>
      {SORT_VALUES.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => handleSortChange(option)}
            className={`rounded-tile-sm min-h-9 px-3.5 text-caption font-emphasis transition-colors duration-200 ${
              active
                ? "bg-primary text-on-dark"
                : "border-border text-secondary hover:border-brand-tint-2 hover:text-brand border bg-surface"
            }`}
          >
            {categoryDetailPage.sortOptions[option]}
          </button>
        );
      })}
    </div>
  );
}
