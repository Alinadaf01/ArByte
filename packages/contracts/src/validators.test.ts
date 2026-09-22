import { describe, expect, it } from "vitest";
import {
  MobileSchema,
  MoneyAmountSchema,
  OtpCodeSchema,
  PostalCodeSchema,
  SlugSchema,
  normalizeDigits,
  slugify,
} from "./validators";

describe("normalizeDigits — معیار پذیرش T-004", () => {
  it("روی ارقام فارسی درست کار می‌کند", () => {
    expect(normalizeDigits("۰۹۱۲۳۴۵۶۷۸۹")).toBe("09123456789");
  });

  it("روی ارقام عربی هم درست کار می‌کند", () => {
    expect(normalizeDigits("٠٩١٢٣٤٥٦٧٨٩")).toBe("09123456789");
  });

  it("ارقام لاتین را دست‌نخورده می‌گذارد", () => {
    expect(normalizeDigits("09123456789")).toBe("09123456789");
  });
});

describe("MobileSchema", () => {
  it("موبایل فارسی را نرمال و قبول می‌کند", () => {
    expect(MobileSchema.parse("۰۹۱۲۳۴۵۶۷۸۹")).toBe("09123456789");
  });

  it("موبایل بدون 09 را رد می‌کند", () => {
    expect(() => MobileSchema.parse("۹۱۲۳۴۵۶۷۸۹")).toThrow();
  });

  it("موبایل با طول اشتباه را رد می‌کند", () => {
    expect(() => MobileSchema.parse("0912345")).toThrow();
  });
});

describe("OtpCodeSchema", () => {
  it("کد ۴ رقمی فارسی را نرمال می‌کند (نمونه‌ی §۲.۱۹)", () => {
    expect(OtpCodeSchema.parse("۵۸۳۲")).toBe("5832");
  });

  it("کد غیر ۴ رقمی را رد می‌کند", () => {
    expect(() => OtpCodeSchema.parse("۵۸")).toThrow();
  });
});

describe("PostalCodeSchema", () => {
  it("کد پستی ۱۰ رقمی عربی را نرمال می‌کند", () => {
    expect(PostalCodeSchema.parse("١٢٣٤٥٦٧٨٩٠")).toBe("1234567890");
  });

  it("کد پستی با طول اشتباه را رد می‌کند", () => {
    expect(() => PostalCodeSchema.parse("123")).toThrow();
  });
});

describe("SlugSchema", () => {
  it("اسلاگ معتبر را قبول می‌کند", () => {
    expect(SlugSchema.parse("asus-rog-strix-g16")).toBe("asus-rog-strix-g16");
  });

  it("اسلاگ فارسی را رد می‌کند", () => {
    expect(() => SlugSchema.parse("لپ-تاپ")).toThrow();
  });

  it("حروف بزرگ را رد می‌کند", () => {
    expect(() => SlugSchema.parse("ASUS-ROG")).toThrow();
  });
});

describe("MoneyAmountSchema", () => {
  it("عدد صحیح مثبت را قبول می‌کند", () => {
    expect(MoneyAmountSchema.parse(289_500_000)).toBe(289_500_000);
  });

  it("عدد منفی را رد می‌کند", () => {
    expect(() => MoneyAmountSchema.parse(-100)).toThrow();
  });

  it("عدد اعشاری را رد می‌کند", () => {
    expect(() => MoneyAmountSchema.parse(100.5)).toThrow();
  });
});

describe("slugify", () => {
  it("نام فارسی را به اسلاگ لاتین معتبر تبدیل می‌کند", () => {
    const slug = slugify("لپ‌تاپ ایسوس ROG Strix G16");
    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(slug.length).toBeGreaterThan(0);
  });

  it("خروجی همیشه با SlugSchema معتبر است", () => {
    const slug = slugify("مانیتور ۲۷ اینچ گیمینگ 240Hz");
    expect(() => SlugSchema.parse(slug)).not.toThrow();
  });

  it("چند خط تیره‌ی پشت‌سرهم را یکی می‌کند", () => {
    expect(slugify("A   B")).toBe("a-b");
  });
});
