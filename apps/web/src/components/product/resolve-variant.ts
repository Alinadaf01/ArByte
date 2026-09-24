import type { PublicVariant } from "@arbyte/contracts";

/**
 * T-214 §۲ — انتخاب اولیه‌ی پیکربندی: `?v=<variantId>` اگر معتبر بود، وگرنه
 * `defaultVariantId` واقعی محصول (نه اولین واریانت آرایه — این تفاوت با
 * `selectCardVariant` در `@arbyte/contracts` است، که برای حالت فیلتر
 * مشخصه‌ی فهرست محصول ساخته شده، نه این‌جا).
 */
export function resolveInitialVariant(
  variants: readonly PublicVariant[],
  defaultVariantId: string,
  requestedVariantId?: string,
): PublicVariant {
  if (requestedVariantId) {
    const requested = variants.find((v) => v.id === requestedVariantId);
    if (requested) return requested;
  }
  const byDefault = variants.find((v) => v.id === defaultVariantId);
  return byDefault ?? variants[0]!;
}
