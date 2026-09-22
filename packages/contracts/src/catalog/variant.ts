import { z } from "zod";
import { MoneyAmountSchema } from "../validators";

/**
 * §۲.۱۵ + الحاقیه T-004 §۱ — `quantity` فقط برای LOW_STOCK حاضر است (عدد
 * دقیق موجودی اطلاعات تجاری است). Discriminated Union به‌جای یک فیلد
 * اختیاری با کامنت، چون تایپ‌اسکریپت خودش این قاعده را در زمان کامپایل
 * Enforce می‌کند — دقیقاً همان الگوی exhaustive-map که در T-003-DECISION
 * برای enum-labels استفاده شد.
 */
export const AvailabilitySchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("IN_STOCK"), warehouseName: z.string() }),
  z.object({
    status: z.literal("LOW_STOCK"),
    quantity: z.number().int().positive(),
    warehouseName: z.string(),
  }),
  z.object({ status: z.literal("OUT_OF_STOCK"), warehouseName: z.string() }),
  z.object({ status: z.literal("PREORDER"), warehouseName: z.string() }),
]);
export type Availability = z.infer<typeof AvailabilitySchema>;

export const PriceSchema = z.object({
  final: MoneyAmountSchema,
  compareAt: MoneyAmountSchema.nullable(),
});

/**
 * الحاقیه §۱ — سرور حساب می‌کند؛ اگر اقساط خاموش است یا مبلغ زیر
 * minAmount است، این فیلد در پاسخ اصلاً نمی‌آید (نه null).
 */
export const InstallmentSchema = z.object({
  maxCount: z.number().int().positive(),
  monthlyAmount: MoneyAmountSchema,
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
export const PublicVariantSchema = z.object({
  id: z.string(),
  sku: z.string(),
  label: z.string(),
  axisValues: z.record(z.string(), z.string()),
  price: PriceSchema,
  availability: AvailabilitySchema,
  installment: InstallmentSchema.optional(),
});
export type PublicVariant = z.infer<typeof PublicVariantSchema>;

/** فهرست محصول (کارت) — تصمیم الحاقیه §۲: قیمت واریانت پیش‌فرض + فلگ. */
export const ProductCardVariantSchema = z.object({
  id: z.string(),
  label: z.string(),
  price: MoneyAmountSchema,
  availability: AvailabilitySchema,
});
