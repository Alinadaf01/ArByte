import { describe, expect, it } from "vitest";
import type { PublicVariant } from "./variant";
import { selectCardVariant } from "./variant-selection";

function makeVariant(
  id: string,
  axisValues: Record<string, string>,
  final: number,
): PublicVariant {
  return {
    id,
    sku: `SKU-${id}`,
    label: Object.values(axisValues).join(" · "),
    axisValues,
    price: { final, compareAt: null },
    availability: { status: "IN_STOCK", warehouseName: "انبار تهران" },
  };
}

describe("selectCardVariant — الحاقیه §۳", () => {
  const variants: PublicVariant[] = [
    makeVariant("v_1", { ram: "۳۲GB", storage: "۱TB" }, 261_000_000),
    makeVariant("v_2", { ram: "۶۴GB", storage: "۲TB" }, 289_500_000),
    makeVariant("v_3", { ram: "۱۲۸GB", storage: "۴TB" }, 333_000_000),
  ];

  it("بدون فیلتر، واریانت پیش‌فرض واقعی محصول را برمی‌گرداند", () => {
    expect(selectCardVariant(variants, "v_2").id).toBe("v_2");
  });

  it("با فیلتر مشخصه‌ی محور، اولین واریانت منطبق را برمی‌گرداند — نه پیش‌فرض", () => {
    // نمونه‌ی دقیق الحاقیه: کاربر روی ۳۲GB کلیک کرده، نباید قیمت ۶۴GB (پیش‌فرض) ببیند.
    const result = selectCardVariant(variants, "v_2", { ram: "۳۲GB" });
    expect(result.id).toBe("v_1");
    expect(result.price.final).toBe(261_000_000);
  });

  it("اگر هیچ واریانتی با فیلتر منطبق نبود، به پیش‌فرض برمی‌گردد", () => {
    const result = selectCardVariant(variants, "v_2", { ram: "256GB" });
    expect(result.id).toBe("v_2");
  });

  it("فیلتر چندمحوره فقط واریانتی که هر دو شرط را دارد برمی‌گرداند", () => {
    const result = selectCardVariant(variants, "v_2", {
      ram: "۱۲۸GB",
      storage: "۴TB",
    });
    expect(result.id).toBe("v_3");
  });

  it("آرایه‌ی خالی خطا می‌دهد — هر محصول حداقل یک واریانت دارد", () => {
    expect(() => selectCardVariant([], "v_1")).toThrow();
  });
});
