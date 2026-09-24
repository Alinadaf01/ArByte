import { describe, expect, it } from "vitest";
import {
  bestValueIndexes,
  compareDirectionForRow,
  parseComparableNumber,
} from "./compare-rules";

describe("parseComparableNumber", () => {
  it("ارقام فارسی را می‌خواند", () => {
    expect(parseComparableNumber("۳٫۶ کیلوگرم")).toBe(3.6);
  });

  it("TB به GB تبدیل می‌شود — ۲TB بزرگ‌تر از ۱۰۲۴GB", () => {
    const tb = parseComparableNumber("۲TB")!;
    const gb = parseComparableNumber("۱۰۲۴GB")!;
    expect(tb).toBeGreaterThan(gb);
    expect(tb).toBe(2048);
  });

  it("واحدهای دیگر فقط عدد را می‌خوانند", () => {
    expect(parseComparableNumber("۲۷۰W")).toBe(270);
    expect(parseComparableNumber("۱۰۰۰ nits")).toBe(1000);
  });

  it("بدون عدد → null", () => {
    expect(parseComparableNumber("Intel Core Ultra 9 275HX")).toBeNull();
  });
});

describe("compareDirectionForRow", () => {
  it("وزن و قیمت کمتر بهتر است", () => {
    expect(compareDirectionForRow("وزن")).toBe("lower-is-better");
    expect(compareDirectionForRow("قیمت")).toBe("lower-is-better");
  });

  it("روشنایی بیشتر بهتر است", () => {
    expect(compareDirectionForRow("روشنایی")).toBe("higher-is-better");
  });

  it("ردیف متنی (بدون جهت) undefined می‌دهد", () => {
    expect(compareDirectionForRow("پردازنده")).toBeUndefined();
  });
});

describe("bestValueIndexes", () => {
  it("کمترین وزن را نشان می‌زند", () => {
    expect(bestValueIndexes("وزن", ["۳٫۶ کیلوگرم", "۲٫۹ کیلوگرم"])).toEqual(
      new Set([1]),
    );
  });

  it("بیشترین روشنایی را نشان می‌زند", () => {
    expect(bestValueIndexes("روشنایی", ["۱۰۰۰ nits", "۱۶۰۰ nits"])).toEqual(
      new Set([1]),
    );
  });

  it("مقادیر یکسان → بدون نشان", () => {
    expect(bestValueIndexes("وزن", ["۲ کیلوگرم", "۲ کیلوگرم"])).toEqual(
      new Set(),
    );
  });

  it("ردیف بدون جهت → بدون نشان", () => {
    expect(bestValueIndexes("پردازنده", ["Core Ultra 9", "Ryzen 9"])).toEqual(
      new Set(),
    );
  });

  it("یک مقدار غیرعددی → بدون نشان برای کل ردیف", () => {
    expect(bestValueIndexes("وزن", ["۲ کیلوگرم", "نامشخص"])).toEqual(new Set());
  });
});
