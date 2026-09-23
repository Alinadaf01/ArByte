"use client";

import { cta as ctaText } from "@arbyte/contracts";
import { useCartStore } from "@/lib/stores/cart-store";

interface AddToCartButtonProps {
  variantId: string;
  productSlug: string;
  outOfStock: boolean;
}

/**
 * T-210 §۶ — تنها بخش کلاینتی `ProductCard` (که خودش عمداً Server
 * Component می‌ماند، بند «stretched link» در همان فایل). روی سبد
 * localStorage می‌نویسد، نه سرور — قیمت/موجودی این‌جا ذخیره نمی‌شود.
 */
export function AddToCartButton({
  variantId,
  productSlug,
  outOfStock,
}: AddToCartButtonProps) {
  const { addItem } = useCartStore();

  return (
    <button
      type="button"
      disabled={outOfStock}
      onClick={(event) => {
        event.preventDefault();
        addItem(variantId, productSlug, 1);
      }}
      className="relative z-10 rounded-pill bg-primary text-on-dark disabled:pointer-events-none disabled:opacity-50 hover:opacity-90 px-4 py-2 text-caption font-emphasis whitespace-nowrap transition-opacity duration-200"
    >
      {ctaText.addToCart}
    </button>
  );
}
