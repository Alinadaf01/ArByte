"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  formatNumberFa,
  formatPrice,
  productDetailPage,
} from "@arbyte/contracts";
import type { PublicVariant } from "@arbyte/contracts";
import { Badge, Toast } from "@arbyte/ui";
import { availabilityLabel, availabilityTone } from "@/lib/labels";
import { useCartStore } from "@/lib/stores/cart-store";
import { useWishlistStore } from "@/lib/stores/wishlist-store";

interface PurchasePanelProps {
  productSlug: string;
  variants: PublicVariant[];
  selectedVariantId: string;
}

const MIN_QTY = 1;
const MAX_QTY = 5;

/**
 * T-214 §۲/§۳ — پیکربندی (واریانت)، تعداد، افزودن به سبد، علاقه‌مندی، toast.
 * تغییر پیکربندی `router.replace` با `?v=` می‌زند (§۲: «قابل اشتراک، بدون
 * ورود به history») — سرور دوباره با واریانت جدید رندر می‌کند، پس قیمت/تب‌ها
 * همگام می‌مانند، بدون نیاز به state جدا برای آن‌ها این‌جا.
 */
export function PurchasePanel({
  productSlug,
  variants,
  selectedVariantId,
}: PurchasePanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [qty, setQty] = useState(1);
  const [qtyTick, setQtyTick] = useState(0);
  const [added, setAdded] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const { addItem } = useCartStore();
  const {
    has,
    addItem: addWishlistItem,
    removeItem: removeWishlistItem,
  } = useWishlistStore();

  const selected =
    variants.find((v) => v.id === selectedVariantId) ?? variants[0]!;
  const outOfStock = selected.availability.status === "OUT_OF_STOCK";
  const maxQty =
    selected.availability.status === "LOW_STOCK"
      ? Math.min(MAX_QTY, selected.availability.quantity)
      : MAX_QTY;
  const isFavorite = has(productSlug, selected.id);
  const total = selected.price.final * qty;

  function selectVariant(variantId: string) {
    startTransition(() => {
      router.replace(`${pathname}?v=${variantId}`, { scroll: false });
    });
  }

  function changeQty(delta: number) {
    setQty((prev) => Math.min(maxQty, Math.max(MIN_QTY, prev + delta)));
    setQtyTick((t) => t + 1);
  }

  function handleAdd() {
    addItem(selected.id, productSlug, qty);
    setAdded(true);
    setToastOpen(true);
  }

  function toggleWishlist() {
    if (isFavorite) removeWishlistItem(productSlug, selected.id);
    else addWishlistItem(productSlug, selected.price.final, selected.id);
  }

  return (
    <div
      className={`border-border bg-surface flex flex-col gap-4.5 rounded-panel border p-5 transition-opacity duration-200 ${
        isPending ? "opacity-60" : "opacity-100"
      }`}
    >
      {variants.length > 1 ? (
        <div className="flex flex-col gap-2.5">
          <p className="text-caption text-primary font-emphasis">
            {productDetailPage.configLabel}
          </p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {variants.map((variant) => {
              const active = variant.id === selected.id;
              const variantOutOfStock =
                variant.availability.status === "OUT_OF_STOCK";
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => selectVariant(variant.id)}
                  aria-pressed={active}
                  className={`flex min-h-12 flex-col items-start gap-0.5 rounded-tile border-2 px-3.5 py-2.5 text-start transition-colors duration-200 ${
                    active
                      ? "border-brand bg-brand-tint-1"
                      : "border-border-input bg-surface hover:border-brand-tint-2"
                  }`}
                >
                  <span
                    className={`text-caption font-emphasis ${active ? "text-primary" : "text-secondary-2"}`}
                  >
                    {variant.label}
                  </span>
                  <span
                    dir="ltr"
                    className={`text-micro ${active ? "text-brand-active" : "text-secondary"}`}
                  >
                    {variantOutOfStock
                      ? availabilityLabel(variant.availability)
                      : formatPrice(BigInt(variant.price.final))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="border-border-divider flex flex-wrap items-end justify-between gap-3 border-t pt-4">
        <div className="flex flex-col gap-1">
          <span dir="ltr" className="text-hero text-primary font-heading">
            {formatPrice(BigInt(total))}
          </span>
          {selected.price.compareAt !== null ? (
            <span
              dir="ltr"
              className="text-caption text-secondary line-through"
            >
              {formatPrice(BigInt(selected.price.compareAt * qty))}
            </span>
          ) : null}
        </div>
        <Badge tone={availabilityTone(selected.availability)}>
          {availabilityLabel(selected.availability)}
        </Badge>
      </div>

      <div className="grid grid-cols-[auto_1fr] items-center gap-2.5 md:grid-cols-[auto_1fr_auto]">
        <div className="border-border-input bg-surface flex items-center gap-0.5 rounded-pill border p-1">
          <button
            type="button"
            onClick={() => changeQty(-1)}
            disabled={outOfStock || qty <= MIN_QTY}
            aria-label={productDetailPage.decreaseQtyAriaLabel}
            className="text-secondary-2 hover:bg-surface-muted flex h-9.5 w-9.5 items-center justify-center rounded-full text-body disabled:opacity-40"
          >
            −
          </button>
          <span
            key={qtyTick}
            className="animate-pop-a min-w-7.5 text-center text-body text-primary font-emphasis"
          >
            {formatNumberFa(qty)}
          </span>
          <button
            type="button"
            onClick={() => changeQty(1)}
            disabled={outOfStock || qty >= maxQty}
            aria-label={productDetailPage.increaseQtyAriaLabel}
            className="text-secondary-2 hover:bg-surface-muted flex h-9.5 w-9.5 items-center justify-center rounded-full text-body disabled:opacity-40"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={outOfStock}
          className={`min-h-12 w-full rounded-pill text-body font-emphasis transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50 md:col-start-2 ${
            added
              ? "border-border-done bg-brand-tint-1 text-brand-active border"
              : "bg-primary text-on-dark"
          }`}
        >
          {added
            ? productDetailPage.addedToCartCta
            : productDetailPage.addToCartCta}
        </button>

        <button
          type="button"
          onClick={toggleWishlist}
          aria-pressed={isFavorite}
          aria-label={
            isFavorite
              ? productDetailPage.removeFromWishlistAriaLabel
              : productDetailPage.addToWishlistAriaLabel
          }
          className={`flex h-12 w-12 flex-none items-center justify-center rounded-full border transition-colors duration-200 disabled:opacity-50 md:row-start-1 ${
            isFavorite
              ? "border-border-done bg-brand-tint-1 text-brand"
              : "border-border-input bg-surface text-secondary-2"
          }`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={isFavorite ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20s-7.4-4.6-7.4-9.6A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.4 2.8c0 5-7.4 9.6-7.4 9.6Z"></path>
          </svg>
        </button>
      </div>

      <Toast open={toastOpen} onOpenChange={setToastOpen}>
        <span className="bg-info/18 flex h-7.5 w-7.5 flex-none items-center justify-center rounded-full">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="text-info"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 12.5 4.5 4.5L19 7.5"></path>
          </svg>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-caption font-emphasis">
            {productDetailPage.toastAddedLabel(
              productDetailPage.toastDeviceCount(formatNumberFa(qty)),
            )}
          </span>
          <span className="text-on-dark-secondary text-micro">
            {formatPrice(BigInt(total))}
          </span>
        </span>
        <a
          href="/cart"
          className="bg-surface text-primary flex-none rounded-pill px-3.5 py-2 text-micro font-emphasis whitespace-nowrap"
        >
          {productDetailPage.viewCartCta}
        </a>
      </Toast>
    </div>
  );
}
