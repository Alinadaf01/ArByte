"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatNumberFa, productsPage } from "@arbyte/contracts";
import type { CatalogFiltersData, CategoryCard } from "@arbyte/contracts";
import type { ShopFilterState } from "./shop-params";
import { toggleInArray } from "./shop-params";

const PRICE_DEBOUNCE_MS = 300;

interface ShopFilterPanelProps {
  categories: CategoryCard[];
  activeCategorySlug: string | null;
  filters: CatalogFiltersData;
  current: ShopFilterState;
  buildCategoryHref: (slug: string | null) => string;
  onUpdate: (updates: Record<string, string | null>) => void;
  onReset: () => void;
  /** موبایل: دکمه‌ی «پاک کردن» جدا از فوتر شیت رندر می‌شود (§۵). */
  showResetInline?: boolean;
}

const CHIP_BASE =
  "inline-flex min-h-9.5 items-center gap-1.5 rounded-tile-sm border px-3.5 text-caption font-emphasis transition-colors duration-200";
const CHIP_ON = "border-primary bg-primary text-on-dark";
const CHIP_OFF =
  "border-border-input bg-surface text-secondary-2 hover:border-brand-tint-2";

/**
 * T-213 §۳ — محتوای فیلتر: دسته/برند/حداکثر قیمت/موجودی/مشخصات. هم در
 * پنل دسکتاپ (سه‌ستونه) و هم داخل Sheet موبایل همین کامپوننت رندر می‌شود
 * (یک منبع حقیقت برای UI فیلتر، طبق §۵: «کامپوننت دوم نساز»).
 */
export function ShopFilterPanel({
  categories,
  activeCategorySlug,
  filters,
  current,
  buildCategoryHref,
  onUpdate,
  onReset,
  showResetInline = false,
}: ShopFilterPanelProps) {
  const committedMillions = Math.round(
    (current.maxPrice ?? filters.priceRange.max) / 1_000_000,
  );
  const [dragMillions, setDragMillions] = useState(committedMillions);
  const debounceRef = useRef<number | undefined>(undefined);

  // فیلتر خارجی (مثلاً «پاک کردن») عوض شد — مقدار محلی را همگام کن.
  useEffect(() => {
    setDragMillions(committedMillions);
  }, [committedMillions]);

  // بازه از بک‌اند (`GET /catalog/filters` → priceRange)، به میلیون تومان.
  const minMillions = Math.floor(filters.priceRange.min / 1_000_000);
  const maxMillions = Math.max(
    Math.ceil(filters.priceRange.max / 1_000_000),
    minMillions + 1,
  );

  // انتهای بازه یعنی «بدون سقف» — پارامتر حذف می‌شود تا گران‌ترین محصول
  // به‌خاطر گرد شدن به میلیون از نتیجه بیرون نیفتد.
  function priceParam(millions: number): string | null {
    return millions >= maxMillions ? null : String(millions * 1_000_000);
  }

  function handlePriceChange(millions: number) {
    setDragMillions(millions);
    if (debounceRef.current !== undefined)
      window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      onUpdate({ maxPrice: priceParam(millions) });
    }, PRICE_DEBOUNCE_MS);
  }

  function commitPriceNow(millions: number) {
    if (debounceRef.current !== undefined)
      window.clearTimeout(debounceRef.current);
    onUpdate({ maxPrice: priceParam(millions) });
  }

  return (
    <div className="grid grid-cols-1 divide-y md:grid-cols-3 md:divide-x md:divide-y-0 md:[&>*]:first:pe-0 [&>*]:divide-border-divider md:[&>*]:px-5">
      <div className="flex flex-col gap-2.5 px-5 py-4.5 md:px-0">
        <p className="text-caption text-primary font-emphasis">
          {productsPage.categoryLabel}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={buildCategoryHref(null)}
            className={`${CHIP_BASE} ${activeCategorySlug === null ? CHIP_ON : CHIP_OFF}`}
          >
            {productsPage.allCategories}
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={buildCategoryHref(cat.slug)}
              className={`${CHIP_BASE} ${activeCategorySlug === cat.slug ? CHIP_ON : CHIP_OFF}`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 px-5 py-4.5 md:px-0">
        <p className="text-caption text-primary font-emphasis">
          {productsPage.brandLabel}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {filters.brands.map((brand) => {
            const on = current.brand.includes(brand.slug);
            return (
              <button
                key={brand.id}
                type="button"
                onClick={() =>
                  onUpdate({
                    brand:
                      toggleInArray(current.brand, brand.slug).join(",") ||
                      null,
                  })
                }
                className={`${CHIP_BASE} ${on ? CHIP_ON : CHIP_OFF}`}
              >
                <span dir="ltr">{brand.name}</span>
                <span className={on ? "text-on-dark/70" : "text-secondary"}>
                  {formatNumberFa(brand.count)}
                </span>
              </button>
            );
          })}
        </div>

        {filters.specs.map((spec) => {
          if (spec.type === "NUMBER" || !spec.options?.length) return null;
          return (
            <div key={spec.specDefId} className="mt-1 flex flex-col gap-2.5">
              <p className="text-caption text-primary font-emphasis">
                {spec.name}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {spec.options.map((opt) => {
                  const on = current.spec[spec.specDefId] === opt.value;
                  const disabled = opt.count === 0 && !on;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        onUpdate({
                          [`spec[${spec.specDefId}]`]: on ? null : opt.value,
                        })
                      }
                      className={`${CHIP_BASE} ${on ? CHIP_ON : CHIP_OFF} disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      <span>{opt.value}</span>
                      <span
                        className={on ? "text-on-dark/70" : "text-secondary"}
                      >
                        {formatNumberFa(opt.count)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2.5 px-5 py-4.5 md:px-0">
        <div className="flex items-baseline justify-between gap-2.5">
          <p className="text-caption text-primary font-emphasis">
            {productsPage.maxPriceLabel}
          </p>
          <p className="text-caption text-secondary">
            {productsPage.upToLabel(formatNumberFa(dragMillions))}
          </p>
        </div>
        <input
          type="range"
          min={minMillions}
          max={maxMillions}
          step={1}
          value={dragMillions}
          onChange={(e) => handlePriceChange(Number(e.target.value))}
          onPointerUp={(e) =>
            commitPriceNow(Number((e.target as HTMLInputElement).value))
          }
          aria-label={productsPage.maxPriceAriaLabel}
          className="accent-brand h-6 w-full cursor-pointer"
        />
        {/* لغزنده در RTL است (کمینه سمت راست)؛ برچسب‌ها هم همان جهت را دارند —
            قبلاً dir="ltr" بودند و کمینه/بیشینه برعکس نمایش داده می‌شد. */}
        <div className="text-secondary-2 -mt-1 flex justify-between text-caption">
          <span>
            {formatNumberFa(minMillions)} {productsPage.millionShort}
          </span>
          <span>
            {formatNumberFa(maxMillions)} {productsPage.millionShort}
          </span>
        </div>

        <label className="border-border-divider text-secondary-2 mt-auto flex min-h-9.5 cursor-pointer items-center gap-2.5 border-t pt-2.5 text-caption">
          <input
            type="checkbox"
            checked={current.inStock}
            onChange={() => onUpdate({ inStock: current.inStock ? null : "1" })}
            className="accent-brand size-4.5 cursor-pointer"
          />
          <span>{productsPage.onlyInStockLabel}</span>
        </label>

        {showResetInline ? (
          <button
            type="button"
            onClick={onReset}
            className="border-border-input text-secondary-2 mt-2 min-h-11 rounded-pill border text-caption font-emphasis"
          >
            {productsPage.clearFiltersCta}
          </button>
        ) : null}
      </div>
    </div>
  );
}
