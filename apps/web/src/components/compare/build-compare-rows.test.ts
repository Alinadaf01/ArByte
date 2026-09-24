import { describe, expect, it } from "vitest";
import type { PublicProductDetail } from "@arbyte/contracts";
import { buildCompareRows, hideRowInDiffMode } from "./build-compare-rows";

function makeProduct(
  id: string,
  price: number,
  specs: Record<string, string>,
): PublicProductDetail {
  return {
    id,
    slug: id,
    name: id,
    brand: { id: "b", name: "B", slug: "b" },
    category: { id: "c", name: "C", slug: "c" },
    condition: "NEW",
    images: [],
    shortDescription: null,
    description: null,
    defaultVariantId: "v1",
    variantAxes: [],
    variants: [
      {
        id: "v1",
        sku: "v1",
        label: "v1",
        axisValues: {},
        price: { final: price, compareAt: null },
        availability: { status: "IN_STOCK" },
      },
    ],
    specifications: [
      {
        groupName: "مشخصات فنی",
        items: Object.entries(specs).map(([name, value]) => ({
          name,
          value,
        })),
      },
    ],
    seo: { title: null, description: null, canonical: null },
  };
}

describe("buildCompareRows", () => {
  it("ردیف قیمت همیشه اول است", () => {
    const rows = buildCompareRows([
      makeProduct("a", 100, { وزن: "۲ کیلوگرم" }),
      makeProduct("b", 200, { وزن: "۳ کیلوگرم" }),
    ]);
    expect(rows[0]?.key).toBe("price");
  });

  it("اجتماع مشخصات از هر دو محصول را می‌سازد، به ترتیب اولین ظهور", () => {
    const rows = buildCompareRows([
      makeProduct("a", 100, { پردازنده: "X", وزن: "۲ کیلوگرم" }),
      makeProduct("b", 200, { گرافیک: "Y", وزن: "۳ کیلوگرم" }),
    ]);
    const keys = rows.map((r) => r.key);
    expect(keys).toEqual(["price", "پردازنده", "وزن", "گرافیک"]);
  });

  it("مشخصه‌ی نبود در یک محصول «—» می‌شود", () => {
    const rows = buildCompareRows([
      makeProduct("a", 100, { پردازنده: "X" }),
      makeProduct("b", 200, {}),
    ]);
    const cpuRow = rows.find((r) => r.key === "پردازنده")!;
    expect(cpuRow.cells).toEqual(["X", "—"]);
  });

  it("ردیف قیمت ارزان‌تر را نشان می‌زند", () => {
    const rows = buildCompareRows([
      makeProduct("a", 200, {}),
      makeProduct("b", 100, {}),
    ]);
    expect(rows[0]?.bestIndexes).toEqual(new Set([1]));
  });
});

describe("hideRowInDiffMode", () => {
  it("مقادیر یکسان → true (پنهان در حالت فقط-تفاوت‌ها)", () => {
    expect(
      hideRowInDiffMode({
        key: "k",
        label: "k",
        cells: ["a", "a"],
        bestIndexes: new Set(),
      }),
    ).toBe(true);
  });

  it("مقادیر متفاوت → false", () => {
    expect(
      hideRowInDiffMode({
        key: "k",
        label: "k",
        cells: ["a", "b"],
        bestIndexes: new Set(),
      }),
    ).toBe(false);
  });
});
