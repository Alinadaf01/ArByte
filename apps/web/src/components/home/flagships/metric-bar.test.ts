import { describe, expect, it } from "vitest";
import { parseMetricMagnitude, relativeBarPercent } from "./metric-bar";

describe("parseMetricMagnitude", () => {
  it("عدد فارسی با واحد را می‌خواند", () => {
    expect(parseMetricMagnitude("۲۷۰W")).toBe(270);
    expect(parseMetricMagnitude("۱۰۰۰ nits")).toBe(1000);
  });

  it("اعشار را هم می‌خواند", () => {
    expect(parseMetricMagnitude("۳٫۶")).toBeCloseTo(3.6);
  });

  it("رشته‌ی بدون عدد صفر برمی‌گرداند، نه کرش", () => {
    expect(parseMetricMagnitude("نامشخص")).toBe(0);
  });
});

describe("relativeBarPercent", () => {
  it("نسبت به بیشینه محاسبه می‌کند", () => {
    expect(relativeBarPercent(270, 320)).toBeCloseTo(84.375);
    expect(relativeBarPercent(320, 320)).toBe(100);
  });

  it("max صفر یا منفی صفر برمی‌گرداند", () => {
    expect(relativeBarPercent(10, 0)).toBe(0);
  });
});
