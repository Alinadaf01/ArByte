import { describe, expect, it } from "vitest";
import { PublicProductDetailSchema, ProductCardSchema } from "./product";

/**
 * معیار پذیرش صریح الحاقیه T-004 §۱۲: «تست serialize: هیچ‌کدام از چهار
 * فیلد سود و دو فیلد کوپن در JSON عمومی نیستند». شبیه‌سازی می‌کند که
 * لایه‌ی سرویس به‌جای انتخاب دقیق فیلد، کل ردیف دیتابیس (شامل فیلدهای
 * ادمین) را به این اسکیما می‌دهد — چون Zod به‌صورت پیش‌فرض کلیدهای خارج
 * از schema را در parse حذف می‌کند (strip، نه passthrough)، حتی در این
 * بدترین حالت هم فیلد حساس نباید در خروجی بماند.
 */
describe("PublicProductDetailSchema — هرگز فیلد حساس لو نمی‌دهد", () => {
  const rawDbRowWithAdminFields = {
    id: "prod_1",
    slug: "msi-titan-18-hx",
    name: "MSI Titan 18 HX A2XWJG",
    brand: { id: "b_1", name: "MSI", slug: "msi" },
    category: { id: "c_1", name: "لپ‌تاپ گیمینگ", slug: "gaming-laptop" },
    condition: "NEW",
    images: [],
    description: null,
    defaultVariantId: "v_1",
    variantAxes: [],
    specifications: [],
    seo: { title: null, description: null, canonical: null },
    variants: [
      {
        id: "v_1",
        sku: "MSI-TITAN18",
        label: "",
        axisValues: {},
        price: { final: 289_500_000, compareAt: null },
        availability: { status: "IN_STOCK" },
        // ⚠️ فیلدهای ادمین که نباید سر از پاسخ عمومی دربیاورند:
        supplierPrice: 245_000_000,
        profitType: "PERCENT",
        profitAmountToman: null,
        profitPercentBasisPoints: 1800,
      },
    ],
    // ⚠️ اگر لایه‌ی سرویس اشتباهاً یک Coupon هم به همین آبجکت اضافه کند:
    amountToman: 50_000,
    percentBasisPoints: 1000,
  };

  it("پارس‌شدن با PublicProductDetailSchema فیلدهای حساس را حذف می‌کند", () => {
    const parsed = PublicProductDetailSchema.parse(rawDbRowWithAdminFields);
    const json = JSON.stringify(parsed);

    expect(json).not.toContain("supplierPrice");
    expect(json).not.toContain("profitType");
    expect(json).not.toContain("profitAmountToman");
    expect(json).not.toContain("profitPercentBasisPoints");
    expect(json).not.toContain("amountToman");
    expect(json).not.toContain("percentBasisPoints");
  });

  it("فیلدهای عمومی مجاز همچنان درست سریالایز می‌شوند", () => {
    const parsed = PublicProductDetailSchema.parse(rawDbRowWithAdminFields);
    expect(parsed.variants[0]?.price.final).toBe(289_500_000);
    expect(parsed.slug).toBe("msi-titan-18-hx");
  });
});

/**
 * T-150 — «مطمئن شو اندپوینت‌های جدید هم زیر همان تست‌اند» (سند §۵)؛
 * `GET /catalog/products` از `ProductCardSchema` استفاده می‌کند، یک اسکیمای
 * کاملاً جدا از `PublicProductDetailSchema` — پس پوشش بالا آن را تضمین
 * نمی‌کند، باید جدا تست شود.
 */
describe("ProductCardSchema — هرگز فیلد حساس لو نمی‌دهد", () => {
  const rawCardRowWithAdminFields = {
    id: "prod_1",
    slug: "msi-titan-18-hx",
    name: "MSI Titan 18 HX A2XWJG",
    brand: { id: "b_1", name: "MSI", slug: "msi" },
    category: { id: "c_1", name: "لپ‌تاپ گیمینگ", slug: "gaming-laptop" },
    condition: "NEW",
    image: null,
    keySpecs: [{ name: "پردازنده", value: "Core Ultra 9" }],
    defaultVariant: {
      id: "v_1",
      label: "۶۴GB · ۲TB",
      price: 289_500_000,
      availability: { status: "IN_STOCK" },
      // ⚠️ فیلدهای ادمین که نباید سر از پاسخ عمومی دربیاورند:
      supplierPrice: 245_000_000,
      profitType: "PERCENT",
      profitAmountToman: null,
      profitPercentBasisPoints: 1800,
    },
    hasMultipleVariants: true,
    variantCount: 3,
  };

  it("پارس‌شدن با ProductCardSchema فیلدهای حساس را حذف می‌کند", () => {
    const parsed = ProductCardSchema.parse(rawCardRowWithAdminFields);
    const json = JSON.stringify(parsed);

    expect(json).not.toContain("supplierPrice");
    expect(json).not.toContain("profitType");
    expect(json).not.toContain("profitAmountToman");
    expect(json).not.toContain("profitPercentBasisPoints");
  });

  it("فیلدهای عمومی مجاز همچنان درست سریالایز می‌شوند", () => {
    const parsed = ProductCardSchema.parse(rawCardRowWithAdminFields);
    expect(parsed.defaultVariant.price).toBe(289_500_000);
    expect(parsed.keySpecs).toHaveLength(1);
  });
});
