const PERSIAN_DIGITS = [
  "۰",
  "۱",
  "۲",
  "۳",
  "۴",
  "۵",
  "۶",
  "۷",
  "۸",
  "۹",
] as const;
const LATIN_TO_PERSIAN = new Map<string, string>(
  PERSIAN_DIGITS.map((d, i) => [String(i), d]),
);
const PERSIAN_TO_LATIN = new Map<string, string>(
  PERSIAN_DIGITS.map((d, i) => [d, String(i)]),
);

/**
 * ارقام لاتین را به فارسی تبدیل می‌کند — فقط برای لایه‌ی نمایش (قاعده‌ی
 * غیرقابل‌مذاکره‌ی #۹). خروجی این تابع هرگز نباید به input، URL، یا پاسخ API
 * برود.
 */
export function toPersianDigits(input: string | number | bigint): string {
  return String(input).replace(/[0-9]/g, (digit) =>
    LATIN_TO_PERSIAN.get(digit)!,
  );
}

/**
 * ارقام فارسی را به لاتین برمی‌گرداند — برای نرمال‌سازی ورودی کاربر
 * (input فرم، جستجو) قبل از ارسال به API.
 */
export function toLatinDigits(input: string): string {
  return input.replace(/[۰-۹]/g, (digit) => PERSIAN_TO_LATIN.get(digit)!);
}
