"use client";

import { useSyncExternalStore } from "react";
import type { Cart } from "@arbyte/contracts";
import {
  addCartItem,
  fetchCart,
  removeCartItem,
  updateCartItemQuantity,
} from "@/lib/cart-api";

/**
 * D-04 §۴ — سبد حالا سمت سرور است (apps/public_api/cart_views.py)، نه
 * localStorage. این فایل همان امضای عمومی T-210 (`CartLine`،
 * `useCartStore().{items,totalQty,addItem,setQty,removeItem,clear}`) را
 * نگه می‌دارد تا کامپوننت‌های مصرف‌کننده (AddToCartButton، PurchasePanel،
 * SiteHeader، MobileNavBar، WishlistView) دست‌نخورده بمانند — فقط منبع
 * داده عوض شده. کلید سشن مهمان در `arbyte:cart-session:v1` (localStorage)
 * نگه‌داری می‌شود و `lib/cart-api.ts` خودش آن را روی هر درخواست می‌فرستد/
 * به‌روز می‌کند.
 *
 * آیتم‌های محلی قدیمی (`arbyte:cart:v1`، پیش از این تسک) یک‌بار به سرور
 * فرستاده و بعد پاک می‌شوند (flushLegacyLocalCart، پایین).
 */
export interface CartLine {
  variantId: string;
  productSlug: string;
  qty: number;
}

const MIN_QTY = 1;
const MAX_QTY = 5;
const LEGACY_LOCAL_CART_KEY = "arbyte:cart:v1";

let serverCart: Cart | null = null;
let lines: readonly CartLine[] = [];
let hydrated = false;
let hydrating: Promise<void> | null = null;
const listeners = new Set<() => void>();
const EMPTY: readonly CartLine[] = [];

function toLines(cart: Cart): CartLine[] {
  return cart.items.map((item) => ({
    variantId: item.variant.id,
    productSlug: item.variant.productSlug,
    qty: item.quantity,
  }));
}

function notify() {
  for (const listener of listeners) listener();
}

function applyCart(cart: Cart | null) {
  if (cart) {
    serverCart = cart;
    lines = toLines(cart);
  }
  hydrated = true;
  notify();
}

function findItemId(variantId: string): string | null {
  return (
    serverCart?.items.find((item) => item.variant.id === variantId)?.id ?? null
  );
}

/** آیتم‌های `arbyte:cart:v1` قدیمی (اگر باشند) را یک‌بار به سرور می‌فرستد و پاک می‌کند. */
async function flushLegacyLocalCart(): Promise<void> {
  let legacy: { variantId?: string; qty?: number }[] = [];
  try {
    const raw = window.localStorage.getItem(LEGACY_LOCAL_CART_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) legacy = parsed as typeof legacy;
    }
  } catch {
    legacy = [];
  }
  if (legacy.length === 0) return;

  for (const line of legacy) {
    if (!line.variantId) continue;
    const qty = Math.min(MAX_QTY, Math.max(MIN_QTY, Math.round(line.qty ?? 1)));
    await addCartItem(line.variantId, qty);
  }
  try {
    window.localStorage.removeItem(LEGACY_LOCAL_CART_KEY);
  } catch {
    // quota/حالت خصوصی — بی‌ضرر، فقط دفعه‌ی بعد دوباره تلاش می‌شود.
  }
}

function hydrate(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (hydrating) return hydrating;
  hydrating = (async () => {
    await flushLegacyLocalCart();
    const cart = await fetchCart();
    applyCart(cart);
    hydrating = null;
  })();
  return hydrating;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  void hydrate();
  return () => listeners.delete(listener);
}

function getSnapshot(): readonly CartLine[] {
  return hydrated ? lines : EMPTY;
}

function getServerSnapshot(): readonly CartLine[] {
  return EMPTY;
}

/** `productSlug` فقط برای سازگاری امضا با نسخه‌ی محلی قبلی نگه داشته شده — سرور خودش آن را برمی‌گرداند. */
async function addItem(variantId: string, _productSlug: string, qty = 1) {
  await hydrate();
  const cart = await addCartItem(variantId, qty);
  if (cart) applyCart(cart);
}

async function setQty(variantId: string, qty: number) {
  await hydrate();
  const itemId = findItemId(variantId);
  if (!itemId) return;
  const clamped = Math.min(MAX_QTY, Math.max(MIN_QTY, Math.round(qty)));
  const cart = await updateCartItemQuantity(itemId, clamped);
  if (cart) applyCart(cart);
}

async function removeItem(variantId: string) {
  await hydrate();
  const itemId = findItemId(variantId);
  if (!itemId) return;
  const cart = await removeCartItem(itemId);
  if (cart) applyCart(cart);
}

async function clear() {
  await hydrate();
  if (!serverCart || serverCart.items.length === 0) return;
  await Promise.all(serverCart.items.map((item) => removeCartItem(item.id)));
  const cart = await fetchCart();
  applyCart(cart);
}

export const cartStore = {
  subscribe,
  getSnapshot,
  getServerSnapshot,
  addItem,
  setQty,
  removeItem,
  clear,
};

/** خواندن سبد در هر کامپوننت کلاینت — بدون prop-drilling از شل سرور. */
export function useCartStore() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
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
