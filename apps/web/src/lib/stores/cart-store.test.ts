// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Cart, CartItem } from "@arbyte/contracts";
import { createLocalArrayStore } from "./create-local-store";

/**
 * D-04 §۴ — cartStore حالا سمت سرور است (lib/cart-api.ts)، پس این تست‌ها
 * آن چهار تابع را mock می‌کنند و یک «سرور جعلی» درون‌حافظه‌ای شبیه‌سازی
 * می‌کنند. هر تست با `vi.resetModules()` + import پویا یک نمونه‌ی تازه از
 * ماژول store می‌گیرد — state داخلی ماژول (serverCart/lines/hydrated)
 * بین تست‌ها مشترک نیست.
 */
vi.mock("@/lib/cart-api", () => ({
  fetchCart: vi.fn(),
  addCartItem: vi.fn(),
  updateCartItemQuantity: vi.fn(),
  removeCartItem: vi.fn(),
}));

let nextId = 1;

function makeCartItem(variantId: string, qty: number): CartItem {
  return {
    id: `item-${variantId}`,
    variant: {
      id: variantId,
      productId: `product-${variantId}`,
      productName: `محصول ${variantId}`,
      productSlug: `product-${variantId}`,
      label: "",
      image: null,
      price: { final: 1_000_000, compareAt: null },
    },
    quantity: qty,
    lineTotal: 1_000_000 * qty,
  };
}

function makeCart(items: CartItem[]): Cart {
  return {
    id: `cart-${nextId++}`,
    items,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotal: items.reduce((sum, i) => sum + i.lineTotal, 0),
  };
}

async function freshStore() {
  vi.resetModules();
  const api = await import("@/lib/cart-api");
  const store = await import("./cart-store");
  return { api: vi.mocked(api), cartStore: store.cartStore };
}

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});

describe("cartStore — سبد سمت سرور (D-04 §۴)", () => {
  it("addItem سرور را صدا می‌زند و snapshot را از پاسخ سرور پر می‌کند", async () => {
    const { api, cartStore } = await freshStore();
    api.fetchCart.mockResolvedValue(makeCart([]));
    api.addCartItem.mockResolvedValue(makeCart([makeCartItem("v1", 2)]));

    await cartStore.addItem("v1", "product-a", 2);

    expect(api.addCartItem).toHaveBeenCalledWith("v1", 2);
    expect(cartStore.getSnapshot()).toEqual([
      { variantId: "v1", productSlug: "product-v1", qty: 2 },
    ]);
  });

  it("setQty آیتم سرور را با itemId درست PATCH می‌کند", async () => {
    const { api, cartStore } = await freshStore();
    api.fetchCart.mockResolvedValue(makeCart([makeCartItem("v1", 1)]));
    api.updateCartItemQuantity.mockResolvedValue(
      makeCart([makeCartItem("v1", 5)]),
    );

    await cartStore.addItem("v1", "product-v1", 1); // hydrate + seed local state
    await cartStore.setQty("v1", 10); // کلمپ سمت سرور اتفاق می‌افتد؛ اینجا فقط فراخوانی را چک می‌کنیم

    expect(api.updateCartItemQuantity).toHaveBeenCalledWith("item-v1", 5);
    expect(cartStore.getSnapshot()[0]?.qty).toBe(5);
  });

  it("removeItem آیتم سرور را با itemId درست DELETE می‌کند", async () => {
    const { api, cartStore } = await freshStore();
    api.fetchCart.mockResolvedValue(makeCart([makeCartItem("v1", 1)]));
    api.addCartItem.mockResolvedValue(makeCart([makeCartItem("v1", 1)]));
    api.removeCartItem.mockResolvedValue(makeCart([]));

    await cartStore.addItem("v1", "product-v1", 1);
    await cartStore.removeItem("v1");

    expect(api.removeCartItem).toHaveBeenCalledWith("item-v1");
    expect(cartStore.getSnapshot()).toEqual([]);
  });

  it("اولین subscribe سبد را از سرور می‌خواند (hydrate)", async () => {
    const { api, cartStore } = await freshStore();
    api.fetchCart.mockResolvedValue(makeCart([makeCartItem("v9", 3)]));

    await new Promise<void>((resolve) => {
      const unsubscribe = cartStore.subscribe(() => {
        if (cartStore.getSnapshot().length > 0) {
          unsubscribe();
          resolve();
        }
      });
    });

    expect(api.fetchCart).toHaveBeenCalled();
    expect(cartStore.getSnapshot()).toEqual([
      { variantId: "v9", productSlug: "product-v9", qty: 3 },
    ]);
  });

  it("آیتم‌های arbyte:cart:v1 قدیمی یک‌بار به سرور فرستاده و پاک می‌شوند", async () => {
    window.localStorage.setItem(
      "arbyte:cart:v1",
      JSON.stringify([
        { variantId: "legacy-1", productSlug: "legacy", qty: 2 },
      ]),
    );
    const { api, cartStore } = await freshStore();
    api.addCartItem.mockResolvedValue(makeCart([makeCartItem("legacy-1", 2)]));
    api.fetchCart.mockResolvedValue(makeCart([makeCartItem("legacy-1", 2)]));

    await new Promise<void>((resolve) => {
      const unsubscribe = cartStore.subscribe(() => {
        if (cartStore.getSnapshot().length > 0) {
          unsubscribe();
          resolve();
        }
      });
    });

    expect(api.addCartItem).toHaveBeenCalledWith("legacy-1", 2);
    expect(window.localStorage.getItem("arbyte:cart:v1")).toBeNull();
  });

  it("وقتی سرور خطا می‌دهد (null)، snapshot قبلی حفظ می‌شود، کرش نمی‌کند", async () => {
    const { api, cartStore } = await freshStore();
    api.fetchCart.mockResolvedValue(makeCart([makeCartItem("v1", 1)]));
    api.addCartItem.mockResolvedValue(makeCart([makeCartItem("v1", 1)]));

    await cartStore.addItem("v1", "product-v1", 1);
    expect(cartStore.getSnapshot()).toHaveLength(1);

    api.addCartItem.mockResolvedValueOnce(null);
    await cartStore.addItem("v2", "product-v2", 1);
    expect(cartStore.getSnapshot()).toEqual([
      { variantId: "v1", productSlug: "product-v1", qty: 1 },
    ]);
  });
});

describe("createLocalArrayStore — مقاومت در برابر localStorage خراب/محدود", () => {
  it("JSON خراب را بی‌خطا نادیده می‌گیرد و آرایه‌ی خالی برمی‌گرداند", () => {
    window.localStorage.setItem("arbyte:test-corrupt:v1", "{not valid json");
    const store = createLocalArrayStore<{ x: number }>(
      "arbyte:test-corrupt:v1",
    );
    const unsubscribe = store.subscribe(() => {});
    expect(store.getItems()).toEqual([]);
    unsubscribe();
  });

  it("setItem که throw می‌کند را قورت می‌دهد (quota/حالت خصوصی)", () => {
    const store = createLocalArrayStore<{ x: number }>("arbyte:test-quota:v1");
    const unsubscribe = store.subscribe(() => {});
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
    expect(() => store.setItems([{ x: 1 }])).not.toThrow();
    spy.mockRestore();
    unsubscribe();
  });
});
