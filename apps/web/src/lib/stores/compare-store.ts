"use client";

import { useSyncExternalStore } from "react";
import { createLocalArrayStore } from "./create-local-store";

/** T-210 §۶ — مقایسه‌ی سمت کاربر، حداکثر سه محصول (`/compare`). */
const MAX_ITEMS = 3;
const STORAGE_KEY = "arbyte:compare:v1";

const store = createLocalArrayStore<string>(STORAGE_KEY);

/** @returns آیا واقعاً اضافه شد — false یعنی سبد مقایسه پر بود. */
function addItem(productSlug: string): boolean {
  const items = store.getItems();
  if (items.includes(productSlug)) return true;
  if (items.length >= MAX_ITEMS) return false;
  store.setItems([...items, productSlug]);
  return true;
}

function removeItem(productSlug: string) {
  store.setItems(store.getItems().filter((slug) => slug !== productSlug));
}

function clear() {
  store.setItems([]);
}

export const compareStore = {
  subscribe: store.subscribe,
  getSnapshot: store.getSnapshot,
  getServerSnapshot: store.getServerSnapshot,
  addItem,
  removeItem,
  clear,
};

export function useCompareStore() {
  const items = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  return {
    items,
    addItem,
    removeItem,
    clear,
    isFull: items.length >= MAX_ITEMS,
  };
}
