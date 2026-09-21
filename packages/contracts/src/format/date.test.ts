import { describe, expect, it } from "vitest";
import { formatDateFa } from "./date";

describe("formatDateFa", () => {
  it("converts a Gregorian date to Jalali with Persian digits", () => {
    // ۲۲ ژوئن ۲۰۲۵ (میلادی) == ۱ تیر ۱۴۰۴ (شمسی) — طبق مثال مستندات jalaliday.
    // ساخت با اجزای local-time تا وابسته به Timezone اجراکننده‌ی تست نباشد.
    const date = new Date(2025, 5, 22, 12, 0, 0);
    expect(formatDateFa(date)).toBe("۱۴۰۴/۰۴/۰۱");
  });

  it("supports a custom format pattern", () => {
    const date = new Date(2025, 5, 22, 12, 0, 0);
    expect(formatDateFa(date, "YYYY-MM-DD")).toBe("۱۴۰۴-۰۴-۰۱");
  });

  it("never contains Latin digits", () => {
    const date = new Date(2025, 5, 22, 12, 0, 0);
    expect(formatDateFa(date)).not.toMatch(/[0-9]/);
  });
});
