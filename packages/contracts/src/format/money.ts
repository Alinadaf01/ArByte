import { toPersianDigits } from "./digits";

/**
 * جداکننده‌ی درست هزارگان فارسی/عربی — U+066C.
 *
 * باگ: نمونه‌ی `money()` در فایل‌های طراحی (docs/design/storefront) به اشتباه
 * از `٫` (U+066B، جداکننده‌ی *اعشار* عربی) به‌جای این کاراکتر استفاده کرده
 * بود — یعنی «۲۸۹٫۵۰۰٫۰۰۰» در واقع «۲۸۹ ممیز ۵۰۰ ممیز ۰۰۰» می‌گفت. جزئیات و
 * دلیل در docs/adr/ADR-004-design-tokens.md.
 */
export const THOUSANDS_SEPARATOR = "٬";

export function groupThousands(digits: string): string {
  const negative = digits.startsWith("-");
  const absDigits = negative ? digits.slice(1) : digits;

  const groups: string[] = [];
  for (let end = absDigits.length; end > 0; end -= 3) {
    groups.unshift(absDigits.slice(Math.max(0, end - 3), end));
  }

  const joined = groups.join(THOUSANDS_SEPARATOR);
  return negative ? `-${joined}` : joined;
}

/**
 * مبلغ (تومان، عدد صحیح) را برای نمایش فرمت می‌کند — قاعده‌ی غیرقابل‌مذاکره‌ی
 * #۷: ورودی همیشه BigInt است، نه float یا number؛ محاسبه‌ی قیمت اینجا انجام
 * نمی‌شود، فقط نمایش (قاعده‌ی #۴ — محاسبه‌ی قیمت فقط در API).
 */
export function formatMoney(
  amountToman: bigint,
  { suffix = "تومان" }: { suffix?: string } = {},
): string {
  const grouped = groupThousands(amountToman.toString());
  const withDigits = toPersianDigits(grouped);
  return suffix ? `${withDigits} ${suffix}` : withDigits;
}

/**
 * نام مستعار formatMoney — T-005 آن را با این نام در معیار پذیرش خواسته.
 * مثال متن T-005 («۷۹,۹۰۰,۰۰۰ تومان») از ویرگول لاتین معمولی استفاده کرده،
 * اما این همان محدودیت رونویسیِ فایل markdown است که در money() طراحی هم
 * دیده شد (ر.ک. ADR-004) — جداکننده‌ی درست همچنان `٬` (U+066C) است، نه `,`.
 */
export const formatPrice = formatMoney;
