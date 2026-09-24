import { toLatinDigits } from "@arbyte/contracts";

export type CompareDirection = "higher-is-better" | "lower-is-better";

/**
 * T-215 §۲ — کدام ردیف «جهتش معلوم است» و کدام طرف بهتر است. کلید دقیقاً
 * همان `name` مشخصه/برچسب ردیف است. ردیف‌هایی که این‌جا نیستند (مثلاً
 * «پردازنده»، «پورت‌ها» — متنی‌اند، نه عددی) هیچ‌وقت نشان بهتر نمی‌گیرند.
 */
const DIRECTION_BY_ROW_NAME: Record<string, CompareDirection> = {
  قیمت: "lower-is-better",
  رم: "higher-is-better",
  "حافظه SSD": "higher-is-better",
  "نرخ نوسازی": "higher-is-better",
  روشنایی: "higher-is-better",
  "ظرفیت باتری": "higher-is-better",
  وزن: "lower-is-better",
};

export function compareDirectionForRow(
  rowName: string,
): CompareDirection | undefined {
  return DIRECTION_BY_ROW_NAME[rowName];
}

const UNIT_TO_GB: Record<string, number> = {
  tb: 1024,
  gb: 1,
};

/**
 * رشته‌ی مشخصه را به عدد قابل‌مقایسه تبدیل می‌کند — ارقام فارسی/عربی،
 * اعشار با «٫»، و واحد GB/TB (برای این دو، مبنای مقایسه GB است: `۲TB` →
 * `۲۰۴۸`، بزرگ‌تر از `۱۰۲۴GB`). واحدهای دیگر (W، nits، کیلوگرم، ...) فقط
 * عدد جلوی‌شان خوانده می‌شود. ناموفق (بدون عدد) → `null`.
 */
export function parseComparableNumber(value: string): number | null {
  const normalized = toLatinDigits(value).trim().replace(/٫/g, ".");
  const match = /^(-?\d+(?:\.\d+)?)\s*(tb|gb)?/i.exec(normalized);
  if (!match?.[1]) return null;
  const num = Number.parseFloat(match[1]);
  if (Number.isNaN(num)) return null;
  const unit = match[2]?.toLowerCase();
  return unit ? num * (UNIT_TO_GB[unit] ?? 1) : num;
}

/** مثل {@link bestValueIndexes} ولی روی عدد خام (نه رشته) — برای ردیف قیمت که عدد واقعی از سرور داریم، نه نیاز به پارس دوباره‌ی رشته‌ی فرمت‌شده (که جداکننده‌ی هزارگان دارد). */
export function bestIndexesFromNumbers(
  direction: CompareDirection,
  values: readonly number[],
): Set<number> {
  const allSame = values.every((v) => v === values[0]);
  if (allSame) return new Set();
  const target =
    direction === "higher-is-better"
      ? Math.max(...values)
      : Math.min(...values);
  return new Set(values.flatMap((v, i) => (v === target ? [i] : [])));
}

/**
 * از میان مقادیر یک ردیف، اندیس(های) «بهترین» را برمی‌گرداند — فقط وقتی
 * جهت ردیف معلوم است، همه مقادیر عددی قابل‌تفسیرند، و همه یکسان نیستند.
 */
export function bestValueIndexes(
  rowName: string,
  values: readonly string[],
): Set<number> {
  const direction = compareDirectionForRow(rowName);
  if (!direction) return new Set();

  const parsed = values.map(parseComparableNumber);
  if (parsed.some((n) => n === null)) return new Set();

  return bestIndexesFromNumbers(direction, parsed as number[]);
}
