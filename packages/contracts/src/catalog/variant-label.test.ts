import { describe, expect, it } from "vitest";
import { buildVariantLabel } from "./variant-label";

describe("buildVariantLabel", () => {
  it("مقادیر محورها را با ' · ' به ترتیب variantAxes وصل می‌کند — نمونه‌ی دقیق الحاقیه", () => {
    const label = buildVariantLabel({ ram: "۶۴GB", storage: "۲TB" }, [
      { specDefId: "ram" },
      { specDefId: "storage" },
    ]);
    expect(label).toBe("۶۴GB · ۲TB");
  });

  it("ترتیب را از variantAxes می‌گیرد، نه از کلیدهای Object", () => {
    const label = buildVariantLabel({ storage: "۲TB", ram: "۶۴GB" }, [
      { specDefId: "ram" },
      { specDefId: "storage" },
    ]);
    expect(label).toBe("۶۴GB · ۲TB");
  });

  it("محصول بدون پیکربندی — variantAxes خالی یعنی برچسب خالی", () => {
    expect(buildVariantLabel({}, [])).toBe("");
  });

  it("محوری که مقدارش در axisValues نیست را نادیده می‌گیرد", () => {
    const label = buildVariantLabel({ ram: "۳۲GB" }, [
      { specDefId: "ram" },
      { specDefId: "storage" },
    ]);
    expect(label).toBe("۳۲GB");
  });
});
