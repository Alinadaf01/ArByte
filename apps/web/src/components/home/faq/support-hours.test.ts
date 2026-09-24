import { describe, expect, it } from "vitest";
import { isWithinSupportHours } from "./support-hours";

const hours = { from: 9, to: 21 };

describe("isWithinSupportHours", () => {
  it("داخل بازه‌ی پشتیبانی تهران true است", () => {
    // ۱۲:۰۰ UTC = ۱۵:۳۰ تهران (UTC+3:30) — داخل بازه.
    const noonUtc = new Date("2026-01-15T12:00:00Z");
    expect(isWithinSupportHours(noonUtc, hours)).toBe(true);
  });

  it("خارج از بازه (نیمه‌شب تهران) false است", () => {
    // ۲۰:۰۰ UTC = ۲۳:۳۰ تهران — خارج بازه.
    const nightUtc = new Date("2026-01-15T20:00:00Z");
    expect(isWithinSupportHours(nightUtc, hours)).toBe(false);
  });

  it("درست روی مرز شروع (۹ صبح تهران) true است", () => {
    // ۰۵:۳۰ UTC = ۰۹:۰۰ تهران.
    const edgeUtc = new Date("2026-01-15T05:30:00Z");
    expect(isWithinSupportHours(edgeUtc, hours)).toBe(true);
  });
});
