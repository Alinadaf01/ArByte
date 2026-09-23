// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { compareStore } from "./compare-store";

beforeEach(() => {
  window.localStorage.clear();
  compareStore.clear();
});

describe("compareStore", () => {
  it("محصول اضافه می‌کند", () => {
    expect(compareStore.addItem("product-a")).toBe(true);
    expect(compareStore.getSnapshot()).toEqual(["product-a"]);
  });

  it("همان محصول را دوباره اضافه نمی‌کند (idempotent)", () => {
    compareStore.addItem("product-a");
    compareStore.addItem("product-a");
    expect(compareStore.getSnapshot()).toEqual(["product-a"]);
  });

  it("سقف سه محصول را رعایت می‌کند — چهارمی رد می‌شود", () => {
    expect(compareStore.addItem("product-a")).toBe(true);
    expect(compareStore.addItem("product-b")).toBe(true);
    expect(compareStore.addItem("product-c")).toBe(true);
    expect(compareStore.addItem("product-d")).toBe(false);
    expect(compareStore.getSnapshot()).toEqual([
      "product-a",
      "product-b",
      "product-c",
    ]);
  });

  it("removeItem یک جای خالی برای محصول بعدی باز می‌کند", () => {
    compareStore.addItem("product-a");
    compareStore.addItem("product-b");
    compareStore.addItem("product-c");
    compareStore.removeItem("product-b");
    expect(compareStore.addItem("product-d")).toBe(true);
    expect(compareStore.getSnapshot()).toEqual([
      "product-a",
      "product-c",
      "product-d",
    ]);
  });
});
