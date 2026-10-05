import { z } from "zod";
import { MoneyAmountSchema } from "../validators";

/**
 * §۲.۱۵ + الحاقیه T-004 §۱ — `quantity` فقط برای LOW_STOCK حاضر است (عدد
 * دقیق موجودی اطلاعات تجاری است). Discriminated Union به‌جای یک فیلد
 * اختیاری با کامنت، چون تایپ‌اسکریپت خودش این قاعده را در زمان کامپایل
 * Enforce می‌کند — دقیقاً همان الگوی exhaustive-map که در T-003-DECISION
 * برای enum-labels استفاده شد.
 *
 * T-149: بدون نام مکان — مدل ما بدون بُعد مکانی برای موجودی است، فقط وضعیت.
 */
export const AvailabilitySchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("IN_STOCK") }),
  z.object({
    status: z.literal("LOW_STOCK"),
    quantity: z.number().int().positive(),
  }),
  z.object({ status: z.literal("OUT_OF_STOCK") }),
  z.object({ status: z.literal("PREORDER") }),
]);
export type Availability = z.infer<typeof AvailabilitySchema>;

export const PriceSchema = z.object({
  final: MoneyAmountSchema,
  compareAt: MoneyAmountSchema.nullable(),
});

/** کدام مشخصات، پیکربندی‌ها را از هم جدا می‌کنند (§۸.۲۶ Custom Value هم ممکن است بین values باشد). */
export const VariantAxisSchema = z.object({
  specDefId: z.string(),
  name: z.string(),
  values: z.array(z.string()),
});
export type VariantAxis = z.infer<typeof VariantAxisSchema>;

/**
 * الحاقیه §۱، هشدار — `label` را سرور می‌سازد (`buildVariantLabel`،
 * catalog/variant-label.ts)، فرانت هرگز خودش نمی‌سازد.
 */
export const SpecificationItemSchema = z.object({
  name: z.string(),
  value: z.string(),
});
export type SpecificationItem = z.infer<typeof SpecificationItemSchema>;

export const PublicVariantSchema = z.object({
  id: z.string(),
  sku: z.string(),
  label: z.string(),
  axisValues: z.record(z.string(), z.string()),
  price: PriceSchema,
  availability: AvailabilitySchema,
  /** AUDIT §۱۲.۴ — مشخصات کلیدی همین واریانت، ترتیب صریح بک‌اند
   * (`key_spec_order`؛ پیش‌فرض پردازنده، گرافیک، رم). اختیاری فقط برای کش
   * ISR قدیمی پیش از این تغییر. */
  keySpecs: z.array(SpecificationItemSchema).max(4).optional(),
});
export type PublicVariant = z.infer<typeof PublicVariantSchema>;

/** فهرست محصول (کارت) — تصمیم الحاقیه §۲: قیمت واریانت پیش‌فرض + فلگ. */
export const ProductCardVariantSchema = z.object({
  id: z.string(),
  label: z.string(),
  price: MoneyAmountSchema,
  availability: AvailabilitySchema,
});
