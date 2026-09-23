import { toLatinDigits } from "@arbyte/contracts";

/**
 * T-211 §۴ — مقدار یک متریک («۲۷۰W»، «۱۰۰۰ nits») رشته‌ی نمایشی است، نه
 * عدد خام (از `ProductSpecification.customValue` می‌آید). برای نوار
 * نسبی باید عدد اول رشته استخراج شود؛ اگر عددی نبود صفر برمی‌گردد —
 * نوار خالی، نه کرش.
 */
export function parseMetricMagnitude(value: string): number {
  /** «٫» (U+066B) جداکننده‌ی اعشار فارسی است، نه «٬» هزارگان — اینجا به «.» نگاشت می‌شود. */
  const latin = toLatinDigits(value).replace(/٫/g, ".");
  const match = /-?\d+(\.\d+)?/.exec(latin);
  return match ? Number(match[0]) : 0;
}

/** درصد پهنای نوار نسبت به بیشینه‌ی دو مقدار — بند §۴: «نسبت به بزرگ‌تر». */
export function relativeBarPercent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}
