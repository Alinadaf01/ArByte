import { describe, expect, it } from "vitest";
import { computeShopRobotsAndCanonical } from "./shop-seo";

describe("computeShopRobotsAndCanonical", () => {
  it("بدون پارامتر → index، canonical خودش", () => {
    expect(computeShopRobotsAndCanonical({}, "/products")).toEqual({
      index: true,
      canonicalPath: "/products",
    });
  });

  it("فقط page (بدون فیلتر) → همچنان index، canonical صفحه‌ی ۱", () => {
    expect(computeShopRobotsAndCanonical({ page: "3" }, "/products")).toEqual({
      index: true,
      canonicalPath: "/products",
    });
  });

  it("هر فیلتر → noindex", () => {
    expect(
      computeShopRobotsAndCanonical({ brand: "msi" }, "/products"),
    ).toEqual({ index: false, canonicalPath: "/products" });
  });

  it("sort → noindex", () => {
    expect(
      computeShopRobotsAndCanonical({ sort: "price_asc" }, "/products"),
    ).toEqual({ index: false, canonicalPath: "/products" });
  });
});
