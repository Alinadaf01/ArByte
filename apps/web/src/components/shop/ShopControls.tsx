"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Sheet } from "@arbyte/ui";
import {
  categoryDetailPage,
  formatNumberFa,
  productsPage,
} from "@arbyte/contracts";
import type {
  CatalogFiltersData,
  CategoryCard,
  ProductSort,
} from "@arbyte/contracts";
import {
  buildCategorySwitchHref,
  countActiveFilters,
  parseShopParams,
  withFilterUpdate,
} from "./shop-params";
import { ShopFilterPanel } from "./ShopFilterPanel";

const SORT_VALUES: readonly ProductSort[] = [
  "featured",
  "price_asc",
  "price_desc",
  "newest",
];

interface ShopControlsProps {
  categories: CategoryCard[];
  activeCategorySlug: string | null;
  filters: CatalogFiltersData;
  resultCount: number;
  children: React.ReactNode;
}

/**
 * T-213 §۳/§۴/§۵ — ارکستر فیلتر: یک `useTransition` مشترک برای همه‌ی
 * کنترل‌های پارامتری (برند/قیمت/موجودی/مشخصات/مرتب‌سازی؛ سوییچ دسته با
 * `<Link>` واقعی جدا مدیریت می‌شود). گرید (children، سرور-رندرشده) هنگام
 * pending کم‌رنگ می‌شود. موبایل: همان `ShopFilterPanel` داخل `Sheet`
 * (Radix Dialog — تله‌ی فوکوس/Escape/قفل اسکرول رایگان).
 */
export function ShopControls({
  categories,
  activeCategorySlug,
  filters,
  resultCount,
  children,
}: ShopControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);

  const rawParams = Object.fromEntries(searchParams.entries());
  const current = parseShopParams(rawParams);
  const activeCount = countActiveFilters(current);

  // T-213 §۱ — نگاشت چیپ دسته یکسان است در هر دو route: با/بدون فیلتر دیگر
  // حفظ می‌شود، فقط `page`/`spec[...]` حذف می‌شوند. تابعش عمداً اینجاست، نه
  // prop از سرور — Server→Client فقط داده‌ی سریالایزپذیر منتقل می‌کند، نه تابع.
  function categoryHref(slug: string | null) {
    return buildCategorySwitchHref(
      rawParams,
      slug ? `/category/${slug}` : "/products",
    );
  }

  function update(
    updates: Record<string, string | null>,
    opts?: { resetPage?: boolean },
  ) {
    const qs = withFilterUpdate(searchParams, updates, opts);
    startTransition(() => {
      router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    });
  }

  function reset() {
    setSheetOpen(false);
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  }

  const panel = (
    <ShopFilterPanel
      categories={categories}
      activeCategorySlug={activeCategorySlug}
      filters={filters}
      current={current}
      buildCategoryHref={categoryHref}
      onUpdate={update}
      onReset={reset}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      {/* موبایل — دکمه‌ی باز کردن Sheet. */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="border-border-input bg-surface text-primary flex min-h-13 items-center justify-between rounded-panel border px-4.5 text-body font-emphasis md:hidden"
      >
        {productsPage.filtersButton}
        <span className="text-brand text-caption font-emphasis">
          {activeCount > 0
            ? productsPage.activeFilterCount(formatNumberFa(activeCount))
            : productsPage.noActiveFilters}
        </span>
      </button>

      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={productsPage.filterSheetTitle}
        footer={
          <div className="grid grid-cols-[1fr_auto] gap-2.5">
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="bg-primary text-on-dark min-h-12.5 rounded-pill text-body font-emphasis"
            >
              {productsPage.showResultsCta(formatNumberFa(resultCount))}
            </button>
            <button
              type="button"
              onClick={reset}
              className="border-border-input text-secondary-2 min-h-12.5 rounded-pill border px-4.5 text-caption font-emphasis"
            >
              {productsPage.clearCta}
            </button>
          </div>
        }
      >
        {panel}
      </Sheet>

      {/* دسکتاپ — پنل بالای گرید. */}
      <div className="border-border bg-surface hidden overflow-hidden rounded-panel border md:block">
        {panel}
      </div>

      <div className="bg-surface border-border flex flex-wrap items-center justify-between gap-3 rounded-panel border p-4">
        <div className="flex items-center gap-3.5">
          <p className="text-caption text-secondary">
            {productsPage.resultCount(formatNumberFa(resultCount))}
          </p>
          <button
            type="button"
            onClick={reset}
            className="border-border-input text-secondary-2 hover:border-brand-tint-2 hover:text-brand min-h-9 rounded-tile-sm border px-3.5 text-caption font-emphasis transition-colors duration-200"
          >
            {productsPage.clearFiltersCta}
          </button>
        </div>
        <div role="group" className="flex flex-wrap gap-1.5">
          {SORT_VALUES.map((option) => {
            const active = current.sort === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => update({ sort: option })}
                className={`min-h-9 rounded-tile-sm px-3.5 text-caption font-emphasis transition-colors duration-200 ${
                  active
                    ? "bg-primary text-on-dark"
                    : "border-border-input text-secondary-2 hover:border-brand-tint-2 hover:text-brand border bg-surface"
                }`}
              >
                {categoryDetailPage.sortOptions[option]}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`transition-opacity duration-200 ${isPending ? "opacity-50" : "opacity-100"}`}
      >
        {children}
      </div>
    </div>
  );
}
