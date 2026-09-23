"use client";

import { useSyncExternalStore } from "react";
import { createLocalArrayStore } from "./create-local-store";

/**
 * T-210 §۶ — سبد سمت کاربر، قبل از این‌که بک‌اند سبد (T-308) و ورود
 * (T-307) ساخته شوند. عمداً فقط شناسه نگه می‌دارد — قیمت/موجودی همیشه از
 * API تازه خوانده می‌شود، این‌جا ذخیره نمی‌شود (بند ۸.۵۵، جلوگیری از
 * دست‌کاری قیمت). بعد از ورود، در T-307/T-308/T-312 با سرور merge می‌شود
 * (ر.ک. docs/api/README.md).
 */
export interface CartLine {
  variantId: string;
  productSlug: string;
  qty: number;
}

const MIN_QTY = 1;
const MAX_QTY = 5;
const STORAGE_KEY = "arbyte:cart:v1";

const store = createLocalArrayStore<CartLine>(STORAGE_KEY);

function clampQty(qty: number): number {
  return Math.min(MAX_QTY, Math.max(MIN_QTY, Math.round(qty)));
}

function addItem(variantId: string, productSlug: string, qty = 1) {
  const items = store.getItems();
  const existing = items.find((line) => line.variantId === variantId);
  if (existing) {
    store.setItems(
      items.map((line) =>
        line.variantId === variantId
          ? { ...line, qty: clampQty(line.qty + qty) }
          : line,
      ),
    );
    return;
  }
  store.setItems([...items, { variantId, productSlug, qty: clampQty(qty) }]);
}

function setQty(variantId: string, qty: number) {
  store.setItems(
    store
      .getItems()
      .map((line) =>
        line.variantId === variantId ? { ...line, qty: clampQty(qty) } : line,
      ),
  );
}

function removeItem(variantId: string) {
  store.setItems(
    store.getItems().filter((line) => line.variantId !== variantId),
  );
}

function clear() {
  store.setItems([]);
}

export const cartStore = {
  subscribe: store.subscribe,
  getSnapshot: store.getSnapshot,
  getServerSnapshot: store.getServerSnapshot,
  addItem,
  setQty,
  removeItem,
  clear,
};

/** خواندن سبد در هر کامپوننت کلاینت — بدون prop-drilling از شل سرور. */
export function useCartStore() {
  const items = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const totalQty = items.reduce((sum, line) => sum + line.qty, 0);

  return {
    items,
    totalQty,
    addItem,
    setQty,
    removeItem,
    clear,
  };
}
