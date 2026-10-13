"use client";

import { useEffect } from "react";
import { trackViewItem } from "@/lib/analytics/ecommerce";

/**
 * صفحه‌ی محصول Server Component است؛ فقط برای رویداد GA4 `view_item`
 * (بند ۲ سند SEO) یک کامپوننت کلاینتی بی‌نمایش لازم است. یک بار در mount —
 * تغییر پیکربندی (?v=) با router.replace یک ناوبری تازه است، پس همین افکت
 * دوباره با پراپ‌های تازه اجرا می‌شود، بدون نیاز به منطق اضافه.
 */
export function ViewItemTracker({
  variantId,
  productName,
  variantLabel,
  price,
}: {
  variantId: string;
  productName: string;
  variantLabel?: string | null;
  price: number;
}) {
  useEffect(() => {
    trackViewItem({
      id: variantId,
      name: productName,
      variant: variantLabel,
      price,
      quantity: 1,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantId]);

  return null;
}
