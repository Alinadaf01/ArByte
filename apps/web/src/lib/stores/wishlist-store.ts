"use client";

import { useSyncExternalStore } from "react";
import { createLocalArrayStore } from "./create-local-store";

/**
 * T-210 §۶ — علاقه‌مندی سمت کاربر. `priceAtSave` استثنای عمدی قاعده‌ی
 * «قیمت ذخیره نشود» است — دقیقاً همان چیزی است که صفحه‌ی علاقه‌مندی باید
 * نشان دهد («وقتی ذخیره کردید X تومان بود، الان Y تومان است»)، نه قیمت
 * فعلی که باز هم از API تازه خوانده می‌شود.
 */
export interface WishlistItem {
  productSlug: string;
  variantId?: string;
  priceAtSave: number;
  savedAt: string;
}

const STORAGE_KEY = "arbyte:wishlist:v1";

const store = createLocalArrayStore<WishlistItem>(STORAGE_KEY);

function matches(item: WishlistItem, productSlug: string, variantId?: string) {
  return item.productSlug === productSlug && item.variantId === variantId;
}

function addItem(productSlug: string, priceAtSave: number, variantId?: string) {
  const items = store.getItems();
  if (items.some((item) => matches(item, productSlug, variantId))) return;
  store.setItems([
    ...items,
    { productSlug, variantId, priceAtSave, savedAt: new Date().toISOString() },
  ]);
}

function removeItem(productSlug: string, variantId?: string) {
  store.setItems(
    store.getItems().filter((item) => !matches(item, productSlug, variantId)),
  );
}

function has(productSlug: string, variantId?: string): boolean {
  return store.getItems().some((item) => matches(item, productSlug, variantId));
}

function clear() {
  store.setItems([]);
}

/** T-215 §۳ — برای «برگرداندن فهرست» بعد از خالی‌کردن (بازیابی محلی، نه یک پشته‌ی undo کامل). */
function replace(items: readonly WishlistItem[]) {
  store.setItems([...items]);
}

/**
 * D-04 §۴ / E-02 §۱ — بعد از ورود صدا زده می‌شود (صفحه‌ی `/login`).
 * علاقه‌مندی محلی (localStorage، قبل از ورود) را با
 * `POST /account/wishlist/merge` (apps/public_api/account_views.py،
 * WishlistMergeView) در حساب کاربر ادغام می‌کند — آیتمی که از قبل در
 * حساب بود دست نمی‌خورد، فقط چیزهای تازه اضافه می‌شوند. بعد از merge
 * موفق، منبع حقیقت حساب سرور می‌شود؛ store محلی پاک می‌شود تا دوبار
 * نمایش داده نشود (صفحه‌ی /wishlist واقعی از سرور می‌خواند).
 *
 * از `/api/proxy/account/wishlist/merge` رد می‌شود، نه مستقیم Django —
 * توکن دیگر در دسترس این کد نیست (کوکی httpOnly، E-02 §۱)؛ پراکسی خودش
 * Authorization را از کوکی می‌سازد. پارامتر ورودی هم برای همین حذف شد.
 */
async function syncAfterLogin(): Promise<boolean> {
  const items = store.getItems();
  if (items.length === 0) return true;

  try {
    const res = await fetch("/api/proxy/account/wishlist/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        items.map((item) => ({
          productSlug: item.productSlug,
          variantId: item.variantId,
          priceAtSave: item.priceAtSave,
        })),
      ),
    });
    if (!res.ok) return false;
    clear();
    return true;
  } catch {
    return false;
  }
}

export const wishlistStore = {
  subscribe: store.subscribe,
  getSnapshot: store.getSnapshot,
  getServerSnapshot: store.getServerSnapshot,
  addItem,
  removeItem,
  replace,
  has,
  clear,
  syncAfterLogin,
};

export function useWishlistStore() {
  const items = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  return { items, addItem, removeItem, replace, has, clear, syncAfterLogin };
}
