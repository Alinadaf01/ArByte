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

export const wishlistStore = {
  subscribe: store.subscribe,
  getSnapshot: store.getSnapshot,
  getServerSnapshot: store.getServerSnapshot,
  addItem,
  removeItem,
  has,
  clear,
};

export function useWishlistStore() {
  const items = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  return { items, addItem, removeItem, has, clear };
}
