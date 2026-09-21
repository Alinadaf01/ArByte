import { describe, expect, it } from "vitest";
import { formatNumberFa } from "./number";

describe("formatNumberFa", () => {
  it("groups and converts to Persian digits", () => {
    expect(formatNumberFa(28190)).toBe("۲۸٬۱۹۰");
  });

  it("handles small numbers with no separator", () => {
    expect(formatNumberFa(3)).toBe("۳");
  });

  it("handles zero and negatives", () => {
    expect(formatNumberFa(0)).toBe("۰");
    expect(formatNumberFa(-1200)).toBe("-۱٬۲۰۰");
  });

  it("rejects non-integers", () => {
    expect(() => formatNumberFa(3.5)).toThrow(RangeError);
  });
});
