import { describe, expect, it } from "vitest";
import { formatMoney, THOUSANDS_SEPARATOR } from "./money";

describe("THOUSANDS_SEPARATOR", () => {
  it("is the Arabic thousands separator U+066C, not the decimal separator U+066B", () => {
    expect(THOUSANDS_SEPARATOR).toBe("٬");
    expect(THOUSANDS_SEPARATOR).not.toBe("٫");
  });
});

describe("formatMoney", () => {
  it("groups by three digits with the correct separator and Persian digits", () => {
    // 289,500,000 — the exact amount ADR-004 uses as the bug example
    expect(formatMoney(289_500_000n)).toBe("۲۸۹٬۵۰۰٬۰۰۰ تومان");
  });

  it("handles amounts under 1000 with no separator", () => {
    expect(formatMoney(500n)).toBe("۵۰۰ تومان");
  });

  it("handles zero", () => {
    expect(formatMoney(0n)).toBe("۰ تومان");
  });

  it("handles negative amounts (e.g. refunds/discounts)", () => {
    expect(formatMoney(-15_000n)).toBe("-۱۵٬۰۰۰ تومان");
  });

  it("omits the suffix when explicitly empty", () => {
    expect(formatMoney(79_900_000n, { suffix: "" })).toBe("۷۹٬۹۰۰٬۰۰۰");
  });

  it("never contains the wrong (decimal) separator U+066B", () => {
    expect(formatMoney(289_500_000n)).not.toContain("٫");
  });
});
