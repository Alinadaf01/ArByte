import { describe, expect, it } from "vitest";
import {
  hoursSentence,
  isOpenNow,
  openingTime,
  parseDays,
  parseTimeRange,
} from "./business-hours";

const ROWS = [{ day: "شنبه تا پنجشنبه", time: "۹:۳۰ تا ۱۸:۰۰" }];

describe("business hours (SiteSettings.business_hours)", () => {
  it("بازه‌ی ساعت فارسی و لاتین", () => {
    expect(parseTimeRange("۹:۳۰ تا ۱۸:۰۰")).toEqual({ from: 9.5, to: 18 });
    expect(parseTimeRange("09:00 - 21:00")).toEqual({ from: 9, to: 21 });
    expect(parseTimeRange("تعطیل")).toBeNull();
    expect(parseTimeRange("21 تا 9")).toBeNull();
  });

  it("روزها: بازه، فهرست، همه‌روزه", () => {
    // شنبه تا پنجشنبه = همه جز جمعه (getDay()=5)
    expect([...parseDays("شنبه تا پنجشنبه")!].sort()).toEqual([
      0, 1, 2, 3, 4, 6,
    ]);
    expect([...parseDays("سه‌شنبه و پنج‌شنبه")!].sort()).toEqual([2, 4]);
    expect(parseDays("جمعه")).toEqual(new Set([5]));
    expect(parseDays("همه‌روزه")).toBeNull();
  });

  it("آنلاین فقط در روز و ساعت کاری تهران", () => {
    // ۲۰۲۶-۰۱-۱۷ شنبه است؛ ۰۷:۰۰ UTC = ۱۰:۳۰ تهران.
    expect(isOpenNow(new Date("2026-01-17T07:00:00Z"), ROWS)).toBe(true);
    // ۰۵:۵۹ UTC = ۰۹:۲۹ تهران → پیش از ۹:۳۰.
    expect(isOpenNow(new Date("2026-01-17T05:59:00Z"), ROWS)).toBe(false);
    // ۲۰۲۶-۰۱-۱۶ جمعه، ۱۰:۳۰ تهران → تعطیل.
    expect(isOpenNow(new Date("2026-01-16T07:00:00Z"), ROWS)).toBe(false);
  });

  it("متن‌های نمایشی از همان ردیف‌ها", () => {
    expect(hoursSentence(ROWS)).toBe("شنبه تا پنجشنبه از ۹:۳۰ تا ۱۸:۰۰");
    expect(openingTime(ROWS)).toBe("۹:۳۰");
  });
});
