/**
 * ARBYTE-SEO-IMPLEMENTATION.md §2 — چهار رویداد الزامی GA4. GTM (نه این فایل)
 * مسئول فوروارد این رویدادها به GA4 است — تگ/تریگر متناظر هر رویداد باید
 * داخل workspace گوگل‌تگ‌منیجر ساخته شود (کار این فایل فقط dataLayer.push
 * درست و امن است).
 *
 * واحد پول: تمام قیمت‌های پروژه (`formatPrice`، دیتابیس، قرارداد) تومان‌اند
 * (ر.ک. packages/contracts/src/format/money.ts) — نه ریال. GA4 فقط کد ISO
 * واقعی می‌پذیرد و «تومان» کد ISO ندارد؛ همان تبدیل ضرب‌در‌۱۰ که از قبل در
 * productJsonLd (apps/web/src/app/products/[slug]/page.tsx) برای IRR استفاده
 * شده، اینجا هم تکرار شده — تومان خام با برچسب IRR ارسال نمی‌شود.
 */

const TOMAN_TO_RIAL = 10;
const CURRENCY = "IRR";

export interface GAItemInput {
  id: string;
  name: string;
  variant?: string | null;
  /** تومان. */
  price: number;
  quantity: number;
}

interface GAItemPayload {
  item_id: string;
  item_name: string;
  item_variant?: string;
  price: number;
  quantity: number;
}

function toRial(tomanAmount: number): number {
  return Math.round(tomanAmount * TOMAN_TO_RIAL);
}

function toGAItem(item: GAItemInput): GAItemPayload {
  return {
    item_id: item.id,
    item_name: item.name,
    ...(item.variant ? { item_variant: item.variant } : {}),
    price: toRial(item.price),
    quantity: item.quantity,
  };
}

function push(payload: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(payload);
}

/** قبل از هر رویداد ecommerce تازه، شیء قبلی را پاک می‌کند تا ایتم‌های
 * رویداد قبل به رویداد بعد درز نکنند — همان الگوی رسمی GA4. */
function pushEcommerceEvent(
  event: string,
  ecommerce: Record<string, unknown>,
): void {
  push({ ecommerce: null });
  push({ event, ecommerce });
}

export function trackViewItem(item: GAItemInput): void {
  pushEcommerceEvent("view_item", {
    currency: CURRENCY,
    value: toRial(item.price * item.quantity),
    items: [toGAItem(item)],
  });
}

export function trackAddToCart(item: GAItemInput): void {
  pushEcommerceEvent("add_to_cart", {
    currency: CURRENCY,
    value: toRial(item.price * item.quantity),
    items: [toGAItem(item)],
  });
}

export function trackBeginCheckout(
  items: GAItemInput[],
  /** تومان — جمع سرور، نه بازسازی‌شده از state کلاینت. */
  totalToman: number,
): void {
  if (items.length === 0) return;
  pushEcommerceEvent("begin_checkout", {
    currency: CURRENCY,
    value: toRial(totalToman),
    items: items.map(toGAItem),
  });
}

export function trackPurchase(params: {
  transactionId: string;
  /** تومان — جمع نهایی تأییدشده‌ی سرور. */
  totalToman: number;
  items: GAItemInput[];
}): void {
  pushEcommerceEvent("purchase", {
    transaction_id: params.transactionId,
    currency: CURRENCY,
    value: toRial(params.totalToman),
    items: params.items.map(toGAItem),
  });
}
