import { describe, expect, it } from "vitest";
import type { PublicVariant } from "@arbyte/contracts";
import { resolveInitialVariant } from "./resolve-variant";

function makeVariant(id: string): PublicVariant {
  return {
    id,
    sku: id,
    label: id,
    axisValues: {},
    price: { final: 100, compareAt: null },
    availability: { status: "IN_STOCK" },
  };
}

const variants = [makeVariant("a"), makeVariant("b"), makeVariant("c")];

describe("resolveInitialVariant", () => {
  it("وقتی ?v= معتبر است همان را برمی‌گرداند", () => {
    expect(resolveInitialVariant(variants, "a", "b").id).toBe("b");
  });

  it("وقتی ?v= نامعتبر است defaultVariantId را برمی‌گرداند، نه اولین واریانت", () => {
    expect(resolveInitialVariant(variants, "c", "bogus").id).toBe("c");
  });

  it("بدون ?v= همیشه defaultVariantId را برمی‌گرداند", () => {
    expect(resolveInitialVariant(variants, "b", undefined).id).toBe("b");
  });

  it("اگر defaultVariantId هم پیدا نشد به اولین واریانت برمی‌گردد", () => {
    expect(resolveInitialVariant(variants, "missing", undefined).id).toBe("a");
  });
});
