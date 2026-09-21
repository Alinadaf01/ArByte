import { describe, expect, it } from "vitest";
import { toLatinDigits, toPersianDigits } from "./digits";

describe("toPersianDigits", () => {
  it("converts every ASCII digit", () => {
    expect(toPersianDigits("0123456789")).toBe("۰۱۲۳۴۵۶۷۸۹");
  });

  it("leaves non-digit characters untouched", () => {
    expect(toPersianDigits("ARB-14042738")).toBe("ARB-۱۴۰۴۲۷۳۸");
  });

  it("accepts numbers and bigints", () => {
    expect(toPersianDigits(2026)).toBe("۲۰۲۶");
    expect(toPersianDigits(289_500_000n)).toBe("۲۸۹۵۰۰۰۰۰");
  });
});

describe("toLatinDigits", () => {
  it("converts every Persian digit back to ASCII", () => {
    expect(toLatinDigits("۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789");
  });

  it("round-trips through toPersianDigits", () => {
    const original = "09123456789";
    expect(toLatinDigits(toPersianDigits(original))).toBe(original);
  });
});
