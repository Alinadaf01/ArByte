import { z } from "zod";
import { toLatinDigits } from "./format/digits";

/**
 * ارقام فارسی/عربی را به لاتین تبدیل می‌کند — روی **همه‌ی ورودی‌های عددی**
 * باید اعمال شود، قبل از ولیدیشن (T-004 بخش ۴، هشدار). کاربر ایرانی
 * می‌تواند «۰۹۱۲...» یا «٠٩١٢...» تایپ کند؛ این یک باگ کلاسیک است که این
 * تابع جلویش را می‌گیرد. نام مستعار `toLatinDigits` (packages/contracts
 * از قبل همین تابع را برای T-005 ساخته بود) — تکرار منطق نیست.
 */
export const normalizeDigits = toLatinDigits;

const MOBILE_REGEX = /^09\d{9}$/;
const OTP_REGEX = /^\d{4}$/;
const POSTAL_CODE_REGEX = /^\d{10}$/;
const SLUG_REGEX = /^[a-z0-9-]+$/;

/**
 * §۴.۴۴ — موبایل: ابتدا نرمال‌سازی رقم، سپس اعتبارسنجی الگوی 09xxxxxxxxx.
 */
export const MobileSchema = z
  .string()
  .transform(normalizeDigits)
  .pipe(
    z
      .string()
      .regex(MOBILE_REGEX, "شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد."),
  );

/**
 * §۲.۱۹ — کد OTP چهار رقمی (نمونه‌ی برند بوک: «۵۸۳۲»).
 */
export const OtpCodeSchema = z
  .string()
  .transform(normalizeDigits)
  .pipe(z.string().regex(OTP_REGEX, "کد وارد شده باید ۴ رقم باشد."));

/**
 * کد پستی ده‌رقمی ایران.
 */
export const PostalCodeSchema = z
  .string()
  .transform(normalizeDigits)
  .pipe(z.string().regex(POSTAL_CODE_REGEX, "کد پستی باید ۱۰ رقم باشد."));

/**
 * §۱۰.۱۳ — فقط `a-z0-9-`؛ اسلاگ فارسی هم مشکل سئو دارد هم انکودینگ URL.
 * برای تولید (نه فقط اعتبارسنجی) از `slugify()` پایین‌تر استفاده کنید.
 */
export const SlugSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(
    SLUG_REGEX,
    "اسلاگ فقط می‌تواند شامل حروف انگلیسی کوچک، عدد و خط تیره باشد.",
  );

/**
 * مبلغ — عدد صحیح مثبت، بدون اعشار (T-004 بخش ۴). در JSON به‌صورت عدد
 * معمولی نمایش داده می‌شود (نه رشته)؛ مبالغ تومانی این پروژه هرگز به سقف
 * safe-integer جاوااسکریپت (~۹ کوادریلیون) نزدیک نمی‌شوند، پس دقت مشکلی
 * ندارد. ذخیره‌سازی در دیتابیس همچنان BigInt است (قاعده‌ی #۷) — این فقط
 * شکل روی سیم (wire format) است.
 */
export const MoneyAmountSchema = z.number().int().positive();

/**
 * تحت‌اللفظ‌نویسی (transliteration) نام فارسی به اسلاگ لاتین — T-004 بخش ۴:
 * «برای محصولات فارسی، از ترنسلیتریشن استفاده کن». نگاشت زیر یک
 * تحت‌اللفظ‌نویسی عملی است (نه آکادمیک) — هدف تولید یک اسلاگ خوانا و
 * یکتاست، نه بازگشت‌پذیری کامل به فارسی. اعداد فارسی/عربی هم قبل از
 * ترنسلیتریشن به لاتین تبدیل می‌شوند.
 */
const PERSIAN_TO_LATIN_LETTERS: Record<string, string> = {
  ا: "a",
  آ: "a",
  أ: "a",
  إ: "e",
  ب: "b",
  پ: "p",
  ت: "t",
  ث: "s",
  ج: "j",
  چ: "ch",
  ح: "h",
  خ: "kh",
  د: "d",
  ذ: "z",
  ر: "r",
  ز: "z",
  ژ: "zh",
  س: "s",
  ش: "sh",
  ص: "s",
  ض: "z",
  ط: "t",
  ظ: "z",
  ع: "a",
  غ: "gh",
  ف: "f",
  ق: "gh",
  ک: "k",
  گ: "g",
  ل: "l",
  م: "m",
  ن: "n",
  و: "v",
  ه: "h",
  ی: "y",
  ة: "h",
  ء: "",
  ئ: "y",
  ؤ: "o",
};

export function slugify(input: string): string {
  const withLatinDigits = normalizeDigits(input);
  const transliterated = Array.from(withLatinDigits)
    .map((char) => PERSIAN_TO_LATIN_LETTERS[char] ?? char)
    .join("");

  return transliterated
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // حذف دیاکریتیک لاتین باقی‌مانده از normalize
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
