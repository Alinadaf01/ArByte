import { describe, expect, it } from "vitest";
import {
  buildCategorySwitchHref,
  countActiveFilters,
  parseShopParams,
  toggleInArray,
  withFilterUpdate,
} from "./shop-params";

describe("parseShopParams", () => {
  it("بدون هیچ پارامتری پیش‌فرض‌های درست می‌دهد", () => {
    const state = parseShopParams({});
    expect(state).toEqual({
      brand: [],
      maxPrice: undefined,
      inStock: false,
      spec: {},
      sort: "featured",
      page: 1,
    });
  });

  it("brand کاما-جداشده را آرایه می‌کند", () => {
    expect(parseShopParams({ brand: "msi,asus" }).brand).toEqual([
      "msi",
      "asus",
    ]);
  });

  it("spec[id]=value را به آبجکت spec می‌خواند", () => {
    const state = parseShopParams({ "spec[ram]": "32GB", "spec[ssd]": "1TB" });
    expect(state.spec).toEqual({ ram: "32GB", ssd: "1TB" });
  });

  it("sort نامعتبر به featured برمی‌گردد", () => {
    expect(parseShopParams({ sort: "bogus" }).sort).toBe("featured");
  });

  it("page نامعتبر یا منفی به ۱ برمی‌گردد", () => {
    expect(parseShopParams({ page: "-3" }).page).toBe(1);
    expect(parseShopParams({ page: "2" }).page).toBe(2);
  });
});

describe("withFilterUpdate", () => {
  it("یک فیلتر جدید اضافه می‌کند و page را پاک می‌کند", () => {
    const current = new URLSearchParams("page=3&maxPrice=200");
    const next = withFilterUpdate(current, { inStock: "1" });
    const parsed = new URLSearchParams(next);
    expect(parsed.get("inStock")).toBe("1");
    expect(parsed.has("page")).toBe(false);
    expect(parsed.get("maxPrice")).toBe("200");
  });

  it("مقدار null یعنی حذف پارامتر", () => {
    const current = new URLSearchParams("brand=msi");
    const next = withFilterUpdate(current, { brand: null });
    expect(new URLSearchParams(next).has("brand")).toBe(false);
  });

  it("sort=featured (پیش‌فرض) در URL نوشته نمی‌شود", () => {
    const next = withFilterUpdate(new URLSearchParams(), {
      sort: "featured",
    });
    expect(new URLSearchParams(next).has("sort")).toBe(false);
  });

  it("resetPage=false مقدار page را نگه می‌دارد", () => {
    const current = new URLSearchParams("page=2");
    const next = withFilterUpdate(current, { page: "3" }, { resetPage: false });
    expect(new URLSearchParams(next).get("page")).toBe("3");
  });
});

describe("toggleInArray", () => {
  it("مقدار غایب را اضافه می‌کند", () => {
    expect(toggleInArray(["msi"], "asus")).toEqual(["msi", "asus"]);
  });
  it("مقدار موجود را حذف می‌کند", () => {
    expect(toggleInArray(["msi", "asus"], "msi")).toEqual(["asus"]);
  });
});

describe("buildCategorySwitchHref", () => {
  it("بدون پارامتر فقط مسیر خالص را می‌دهد", () => {
    expect(buildCategorySwitchHref({}, "/category/laptop")).toBe(
      "/category/laptop",
    );
  });

  it("brand/maxPrice/inStock/sort را حفظ می‌کند", () => {
    const href = buildCategorySwitchHref(
      { brand: "msi", maxPrice: "200", inStock: "1", sort: "newest" },
      "/products",
    );
    const [, qs] = href.split("?");
    const parsed = new URLSearchParams(qs);
    expect(parsed.get("brand")).toBe("msi");
    expect(parsed.get("maxPrice")).toBe("200");
    expect(parsed.get("inStock")).toBe("1");
    expect(parsed.get("sort")).toBe("newest");
  });

  it("page و spec[...] را حذف می‌کند", () => {
    const href = buildCategorySwitchHref(
      { page: "3", "spec[ram]": "32GB", brand: "asus" },
      "/products",
    );
    const [, qs] = href.split("?");
    const parsed = new URLSearchParams(qs);
    expect(parsed.has("page")).toBe(false);
    expect(parsed.has("spec[ram]")).toBe(false);
    expect(parsed.get("brand")).toBe("asus");
  });
});

describe("countActiveFilters", () => {
  it("همه‌ی گروه‌ها را جمع می‌زند", () => {
    const n = countActiveFilters({
      brand: ["msi", "asus"],
      maxPrice: 200,
      inStock: true,
      spec: { ram: "32GB" },
      sort: "featured",
      page: 1,
    });
    expect(n).toBe(5);
  });

  it("بدون فیلتر صفر است", () => {
    expect(
      countActiveFilters({
        brand: [],
        maxPrice: undefined,
        inStock: false,
        spec: {},
        sort: "featured",
        page: 1,
      }),
    ).toBe(0);
  });
});
