// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cartStore } from "./cart-store";
import { createLocalArrayStore } from "./create-local-store";

beforeEach(() => {
  window.localStorage.clear();
  cartStore.clear();
});

describe("cartStore", () => {
  it("محصول جدید اضافه می‌کند و qty را بین ۱ و ۵ محدود می‌کند", () => {
    cartStore.addItem("v1", "product-a", 2);
    expect(cartStore.getSnapshot()).toEqual([
      { variantId: "v1", productSlug: "product-a", qty: 2 },
    ]);

    cartStore.addItem("v2", "product-b", 99);
    expect(cartStore.getSnapshot().find((l) => l.variantId === "v2")?.qty).toBe(
      5,
    );
  });

  it("افزودن همان variantId دوباره، qty را جمع می‌زند نه ردیف جدید", () => {
    cartStore.addItem("v1", "product-a", 2);
    cartStore.addItem("v1", "product-a", 2);
    const items = cartStore.getSnapshot();
    expect(items).toHaveLength(1);
    expect(items[0]?.qty).toBe(4);
  });

  it("qty جمعی حتی روی افزودن هم سقف ۵ را رعایت می‌کند", () => {
    cartStore.addItem("v1", "product-a", 4);
    cartStore.addItem("v1", "product-a", 4);
    expect(cartStore.getSnapshot()[0]?.qty).toBe(5);
  });

  it("setQty مقدار را کلمپ می‌کند", () => {
    cartStore.addItem("v1", "product-a", 1);
    cartStore.setQty("v1", 0);
    expect(cartStore.getSnapshot()[0]?.qty).toBe(1);
    cartStore.setQty("v1", 10);
    expect(cartStore.getSnapshot()[0]?.qty).toBe(5);
  });

  it("removeItem ردیف را حذف می‌کند", () => {
    cartStore.addItem("v1", "product-a", 1);
    cartStore.removeItem("v1");
    expect(cartStore.getSnapshot()).toEqual([]);
  });

  it("روی localStorage با کلید نسخه‌دار ذخیره می‌کند", () => {
    cartStore.addItem("v1", "product-a", 1);
    const raw = window.localStorage.getItem("arbyte:cart:v1");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw ?? "[]")).toEqual([
      { variantId: "v1", productSlug: "product-a", qty: 1 },
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
