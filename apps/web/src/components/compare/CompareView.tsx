"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { comparePage } from "@arbyte/contracts";
import type { PublicProductDetail } from "@arbyte/contracts";
import { resolveInitialVariant } from "@/components/product/resolve-variant";
import { formatPrice } from "@arbyte/contracts";
import { useCompareStore } from "@/lib/stores/compare-store";
import { buildCompareRows, hideRowInDiffMode } from "./build-compare-rows";
import { AddDevicePicker } from "./AddDevicePicker";

interface CompareViewProps {
  products: PublicProductDetail[];
  diffOnly: boolean;
}

const MAX_ITEMS = 3;

function buildCompareHref(slugs: readonly string[], diffOnly: boolean): string {
  const params = new URLSearchParams();
  if (slugs.length > 0) params.set("p", slugs.join(","));
  if (diffOnly) params.set("diff", "1");
  const qs = params.toString();
  return `/compare${qs ? `?${qs}` : ""}`;
}

/**
 * T-215 §۲ — URL منبع حقیقت. `compare-store` فقط آخرین مجموعه‌ی
 * غیرخالی را برای بازگشت بعدی به صفحه (مثلاً از میان‌بر مگامنو) نگه
 * می‌دارد؛ «برگرداندن مقایسه» مقدار همین صفحه هنگام mount را برمی‌گرداند
 * (نه یک پشته‌ی undo کامل).
 */
export function CompareView({ products, diffOnly }: CompareViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);
  const { replace: replaceCompareStore } = useCompareStore();
  const initialSlugsRef = useRef(products.map((p) => p.slug));

  const slugs = products.map((p) => p.slug);
  // T-215 §۲ — کلیک‌های پی‌درپی (مثلاً حذف دو کارت پشت‌سرهم) قبل از این‌که
  // رندر جدید از سرور برسد می‌توانند closure یکسانِ `slugs` را ببینند —
  // همان دسته‌باگی که در استپر تعداد T-214 پیدا شد. یک ref که خودش را
  // synchronous به‌روزرسانی می‌کند، این مشکل را می‌بندد.
  const slugsRef = useRef<readonly string[]>(slugs);
  slugsRef.current = slugs;

  useEffect(() => {
    if (slugs.length > 0) replaceCompareStore(slugs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugs.join(",")]);

  function navigate(nextSlugs: readonly string[], nextDiff: boolean) {
    slugsRef.current = nextSlugs;
    startTransition(() => {
      router.replace(buildCompareHref(nextSlugs, nextDiff), { scroll: false });
    });
  }

  function handleRemove(slug: string) {
    navigate(
      slugsRef.current.filter((s) => s !== slug),
      diffOnly,
    );
  }

  function handleAdd(slug: string) {
    setPickerOpen(false);
    navigate([...slugsRef.current, slug], diffOnly);
  }

  function handleDiffToggle() {
    navigate(slugsRef.current, !diffOnly);
  }

  function handleReset() {
    navigate(initialSlugsRef.current, false);
  }

  const rows = buildCompareRows(products);
  const visibleRows = diffOnly
    ? rows.filter((r) => !hideRowInDiffMode(r))
    : rows;
  const isEmpty = products.length === 0;

  return (
    <div
      className={`flex flex-col gap-5 transition-opacity duration-200 ${isPending ? "opacity-60" : "opacity-100"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!isEmpty ? (
          <label className="border-border bg-surface flex min-h-11 cursor-pointer items-center gap-2.5 rounded-tile-sm border px-4 text-caption text-secondary-2">
            <input
              type="checkbox"
              checked={diffOnly}
              onChange={handleDiffToggle}
              className="accent-brand size-4.5 cursor-pointer"
            />
            <span>{comparePage.diffOnlyLabel}</span>
          </label>
        ) : (
          <span />
        )}
      </div>

      {!isEmpty ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const variant = resolveInitialVariant(
              product.variants,
              product.defaultVariantId,
            );
            return (
              <article
                key={product.id}
                className="border-border relative flex flex-col overflow-hidden rounded-card border bg-surface"
              >
                <div className="bg-surface-muted relative aspect-[4/3] w-full">
                  {product.images[0] ? (
                    <Image
                      src={product.images[0].url}
                      alt={product.images[0].alt ?? product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-contain p-5"
                    />
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(product.slug)}
                  aria-label={comparePage.removeAriaLabel}
                  className="bg-surface/94 border-border hover:text-danger absolute start-3 top-3 flex h-11 w-11 items-center justify-center rounded-full border text-secondary transition-colors duration-200"
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  >
                    <path d="m7 7 10 10M17 7 7 17" />
                  </svg>
                </button>
                <div className="flex flex-1 flex-col gap-2.5 p-4.5">
                  <span
                    dir="ltr"
                    className="text-caption text-secondary-2 font-emphasis"
                  >
                    {product.brand.name}
                  </span>
                  <h2 className="text-card-title text-primary font-heading line-clamp-2 leading-6">
                    {product.name}
                  </h2>
                  <span
                    dir="ltr"
                    className="text-card-title text-primary font-heading"
                  >
                    {formatPrice(BigInt(variant.price.final))}
                  </span>
                  <Link
                    href={`/products/${product.slug}?v=${variant.id}`}
                    className="bg-primary text-on-dark hover:bg-brand mt-auto flex min-h-11 items-center justify-center rounded-pill text-caption font-emphasis transition-colors duration-200"
                  >
                    {comparePage.viewAndBuyCta}
                  </Link>
                </div>
              </article>
            );
          })}

          {products.length < MAX_ITEMS ? (
            <div className="flex flex-col gap-3">
              {pickerOpen ? (
                <AddDevicePicker
                  excludeSlugs={slugs}
                  onPick={handleAdd}
                  onClose={() => setPickerOpen(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="border-border-done bg-paper text-brand-active hover:bg-brand-tint-1 flex min-h-full flex-col items-center justify-center gap-2.5 rounded-card border-2 border-dashed p-6 text-caption font-emphasis transition-colors duration-200"
                >
                  <span className="bg-brand-tint-1 flex h-11 w-11 items-center justify-center rounded-full">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M12 6v12M6 12h12" />
                    </svg>
                  </span>
                  {comparePage.addDeviceCta}
                </button>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="border-border bg-surface flex flex-col items-center gap-3 rounded-card border px-6 py-14 text-center">
          <p className="text-subhead text-primary font-heading">
            {comparePage.emptyState.title}
          </p>
          <p className="text-body text-secondary max-w-[46ch]">
            {comparePage.emptyState.body}
          </p>
          {initialSlugsRef.current.length > 0 ? (
            <button
              type="button"
              onClick={handleReset}
              className="bg-primary text-on-dark hover:bg-brand mt-2 flex min-h-12 items-center rounded-pill px-6 text-caption font-emphasis transition-colors duration-200"
            >
              {comparePage.emptyState.resetCta}
            </button>
          ) : (
            <AddDevicePicker
              excludeSlugs={[]}
              onPick={handleAdd}
              onClose={() => {}}
            />
          )}
        </div>
      )}

      {!isEmpty && visibleRows.length > 0 ? (
        <div className="border-border bg-surface overflow-x-auto rounded-card border">
          <div
            className="grid min-w-[520px]"
            style={{
              gridTemplateColumns: `minmax(110px,0.85fr) repeat(${products.length}, minmax(140px,1fr))`,
            }}
          >
            {visibleRows.map((row, rowIndex) => (
              <div key={row.key} className="contents">
                <span
                  className={`text-caption text-secondary sticky start-0 flex items-center border-b p-3.5 ps-4.5 ${
                    rowIndex % 2 ? "bg-paper" : "bg-surface"
                  } border-border-divider`}
                >
                  {row.label}
                </span>
                {row.cells.map((cell, cellIndex) => {
                  const best = row.bestIndexes.has(cellIndex);
                  return (
                    <span
                      key={cellIndex}
                      className={`text-caption border-border-divider flex items-center gap-1.5 border-b p-3.5 ${
                        rowIndex % 2 ? "bg-paper" : "bg-surface"
                      } ${best ? "text-primary font-emphasis" : "text-secondary-2 font-medium"}`}
                    >
                      {best ? (
                        <i className="bg-brand block h-1.5 w-1.5 flex-none rounded-full" />
                      ) : null}
                      {cell}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
