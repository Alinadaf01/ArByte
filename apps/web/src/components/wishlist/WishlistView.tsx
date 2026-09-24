"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatNumberFa, formatPrice, wishlistPage } from "@arbyte/contracts";
import type { PublicProductDetail, PublicVariant } from "@arbyte/contracts";
import { availabilityLabel, availabilityTone } from "@/lib/labels";
import { AVAILABILITY_TEXT_TONE } from "@/lib/labels";
import { getProductsBySlugsClient } from "@/lib/catalog-client";
import { resolveInitialVariant } from "@/components/product/resolve-variant";
import { useCartStore } from "@/lib/stores/cart-store";
import {
  useWishlistStore,
  type WishlistItem,
} from "@/lib/stores/wishlist-store";

interface ResolvedItem {
  wishlistItem: WishlistItem;
  product: PublicProductDetail;
  variant: PublicVariant;
}

function trendLabel(
  current: number,
  was: number,
): {
  text: string;
  tone: "down" | "up" | "same";
} {
  if (current < was) {
    const percent = formatNumberFa(Math.round((1 - current / was) * 100));
    return { text: wishlistPage.priceTrend.down(percent), tone: "down" };
  }
  if (current > was) {
    const percent = formatNumberFa(Math.round((current / was - 1) * 100));
    return { text: wishlistPage.priceTrend.up(percent), tone: "up" };
  }
  return { text: wishlistPage.priceTrend.same, tone: "same" };
}

const TREND_COLOR: Record<"down" | "up" | "same", string> = {
  down: "text-info",
  up: "text-warning",
  same: "text-secondary",
};

/**
 * T-215 §۳ — صفحه شخصی/بدون ایندکس، پس واکشی سمت کلاینت مجاز است (سند
 * تسک). محصول حذف‌شده/غیرفعال → کارت «دیگر در فروشگاه نیست»، صفحه نشکند.
 */
export function WishlistView() {
  const { items, removeItem, clear, replace } = useWishlistStore();
  const { addItem: addToCart, items: cartItems } = useCartStore();
  const [resolved, setResolved] = useState<ResolvedItem[]>([]);
  const [missingSlugs, setMissingSlugs] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [addAllDone, setAddAllDone] = useState(false);
  const initialItemsRef = useRef<readonly WishlistItem[] | null>(null);

  useEffect(() => {
    if (initialItemsRef.current === null && items.length > 0) {
      initialItemsRef.current = items;
    }
  }, [items]);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    getProductsBySlugsClient(items.map((i) => i.productSlug)).then(
      (products) => {
        if (cancelled) return;
        const bySlug = new Map(products.map((p) => [p.slug, p]));
        const next: ResolvedItem[] = [];
        const missing: string[] = [];
        for (const item of items) {
          const product = bySlug.get(item.productSlug);
          if (!product) {
            missing.push(item.productSlug);
            continue;
          }
          const variant = resolveInitialVariant(
            product.variants,
            product.defaultVariantId,
            item.variantId,
          );
          next.push({ wishlistItem: item, product, variant });
        }
        setResolved(next);
        setMissingSlugs(missing);
        setLoaded(true);
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => `${i.productSlug}:${i.variantId ?? ""}`).join(",")]);

  function handleAddAll() {
    const eligible = resolved.filter(
      (r) => r.variant.availability.status !== "OUT_OF_STOCK",
    );
    for (const r of eligible) {
      addToCart(r.variant.id, r.product.slug, 1);
    }
    setAddAllDone(true);
  }

  function handleClear() {
    setAddAllDone(false);
    clear();
  }

  function handleRestore() {
    if (initialItemsRef.current) replace(initialItemsRef.current);
  }

  const dropCount = resolved.filter(
    (r) => r.variant.price.final < r.wishlistItem.priceAtSave,
  ).length;
  const hasAny = items.length > 0;
  const isEmpty = loaded && items.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="text-body text-secondary max-w-[52ch]">
          {dropCount > 0
            ? wishlistPage.introWithDrops(formatNumberFa(dropCount))
            : wishlistPage.introNoDrops}
        </p>
        <p className="text-caption text-secondary whitespace-nowrap">
          <span className="text-primary font-emphasis">
            {formatNumberFa(items.length)}
          </span>{" "}
          {wishlistPage.itemsLabel}
        </p>
      </div>

      {hasAny ? (
        <div className="border-border bg-surface flex flex-wrap items-center justify-between gap-3 rounded-panel border p-4">
          <p className="text-caption text-secondary-2">
            {wishlistPage.dropNote}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAddAll}
              className={`animate-pop-a min-h-11 rounded-tile-sm px-4.5 text-caption font-emphasis transition-colors duration-200 ${
                addAllDone
                  ? "bg-brand-tint-1 text-brand-active"
                  : "bg-primary text-on-dark"
              }`}
            >
              {addAllDone ? wishlistPage.addAllDoneCta : wishlistPage.addAllCta}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="border-border-input hover:text-danger min-h-11 rounded-tile-sm border px-4.5 text-caption font-emphasis text-secondary-2 transition-colors duration-200"
            >
              {wishlistPage.clearCta}
            </button>
          </div>
        </div>
      ) : null}

      {isEmpty ? (
        <div className="border-border bg-surface flex flex-col items-center gap-3.5 rounded-card border px-6 py-16 text-center">
          <span className="bg-brand-tint-1 flex h-15.5 w-15.5 items-center justify-center rounded-full">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-brand"
            >
              <path d="M12 20s-7.4-4.6-7.4-9.6A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.4 2.8c0 5-7.4 9.6-7.4 9.6Z" />
            </svg>
          </span>
          <p className="text-subhead text-primary font-heading">
            {wishlistPage.emptyState.title}
          </p>
          <p className="text-body text-secondary max-w-[44ch]">
            {wishlistPage.emptyState.body}
          </p>
          <div className="mt-1.5 flex flex-wrap justify-center gap-2.5">
            <Link
              href="/products"
              className="bg-primary text-on-dark hover:bg-brand flex min-h-12 items-center rounded-pill px-6 text-caption font-emphasis transition-colors duration-200"
            >
              {wishlistPage.emptyState.shopCta}
            </Link>
            {initialItemsRef.current && initialItemsRef.current.length > 0 ? (
              <button
                type="button"
                onClick={handleRestore}
                className="border-border-input hover:border-brand-tint-2 hover:text-brand-active flex min-h-12 items-center rounded-pill border px-5.5 text-caption font-emphasis text-secondary-2 transition-colors duration-200"
              >
                {wishlistPage.emptyState.restoreCta}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {resolved.length > 0 || missingSlugs.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {resolved.map(({ wishlistItem, product, variant }) => {
            const trend = trendLabel(
              variant.price.final,
              wishlistItem.priceAtSave,
            );
            const outOfStock = variant.availability.status === "OUT_OF_STOCK";
            const inCart = cartItems.some(
              (line) => line.variantId === variant.id,
            );
            return (
              <article
                key={`${product.slug}-${variant.id}`}
                className="border-border relative flex flex-col overflow-hidden rounded-card border bg-surface"
              >
                <Link
                  href={`/products/${product.slug}?v=${variant.id}`}
                  className="bg-surface-muted relative block aspect-[16/11] w-full"
                >
                  {product.images[0] ? (
                    <Image
                      src={product.images[0].url}
                      alt={product.images[0].alt ?? product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-contain p-4"
                    />
                  ) : null}
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    removeItem(product.slug, wishlistItem.variantId)
                  }
                  aria-label={wishlistPage.removeAriaLabel}
                  className="bg-surface/94 border-border text-brand hover:text-danger absolute start-3 top-3 flex h-11 w-11 items-center justify-center rounded-full border transition-colors duration-200"
                >
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20s-7.4-4.6-7.4-9.6A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.4 2.8c0 5-7.4 9.6-7.4 9.6Z" />
                  </svg>
                </button>
                <div className="flex flex-1 flex-col gap-2 p-4.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-caption text-brand font-emphasis">
                      {product.category.name}
                    </span>
                    <span
                      dir="ltr"
                      className="text-caption text-secondary-2 font-emphasis"
                    >
                      {product.brand.name}
                    </span>
                  </div>
                  <h2 className="text-card-title text-primary font-heading line-clamp-2 leading-6">
                    {product.name}
                  </h2>
                  <p className="flex flex-wrap items-center gap-1.5 text-caption">
                    <span
                      className={`font-emphasis ${TREND_COLOR[trend.tone]}`}
                    >
                      {trend.text}
                    </span>
                    <span className="bg-border h-0.75 w-0.75 rounded-full" />
                    <span
                      className={
                        AVAILABILITY_TEXT_TONE[
                          availabilityTone(variant.availability)
                        ]
                      }
                    >
                      {availabilityLabel(variant.availability)}
                    </span>
                  </p>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2.5 pt-1.5">
                    <span
                      dir="ltr"
                      className="text-card-title text-primary font-heading"
                    >
                      {formatPrice(BigInt(variant.price.final))}
                    </span>
                    {outOfStock ? null : (
                      <button
                        type="button"
                        onClick={() => addToCart(variant.id, product.slug, 1)}
                        className={`min-h-10 rounded-pill px-4 text-caption font-emphasis transition-colors duration-200 ${
                          inCart
                            ? "bg-brand-tint-1 text-brand-active"
                            : "bg-primary text-on-dark"
                        }`}
                      >
                        {inCart
                          ? wishlistPage.addedToCartCta
                          : wishlistPage.addToCartCta}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          {missingSlugs.map((slug) => (
            <article
              key={slug}
              className="border-border-input bg-paper flex flex-col items-center justify-center gap-3 rounded-card border border-dashed p-6 text-center"
            >
              <p className="text-caption text-secondary">
                {wishlistPage.removedNote}
              </p>
              <button
                type="button"
                onClick={() => removeItem(slug)}
                className="text-caption text-secondary-2 hover:text-danger font-emphasis"
              >
                {wishlistPage.removeAriaLabel}
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
