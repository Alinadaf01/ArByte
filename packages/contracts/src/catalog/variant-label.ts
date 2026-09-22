import type { VariantAxis } from "./variant";

/**
 * الحاقیه §۱، هشدار — سرور `label` را می‌سازد، نه فرانت. اگر فرانت خودش
 * بسازد، در سبد و سفارش و ایمیل سه شکل متفاوت می‌شود. ترتیب مقادیر از
 * `variantAxes` محصول می‌آید (نه از ترتیب کلیدهای Object، که در جاوااسکریپت
 * تضمین‌شده نیست)، با ` · ` به هم وصل می‌شوند — دقیقاً مثل نمونه‌ی الحاقیه
 * («۶۴GB · ۲TB»).
 */
export function buildVariantLabel(
  axisValues: Record<string, string>,
  variantAxes: Pick<VariantAxis, "specDefId">[],
): string {
  return variantAxes
    .map((axis) => axisValues[axis.specDefId])
    .filter((value): value is string => Boolean(value))
    .join(" · ");
}
