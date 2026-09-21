/**
 * این فایل عمداً از باندل اصلی `@arbyte/contracts` صادر نمی‌شود — فقط از
 * `@arbyte/contracts/date` وارد کنید.
 *
 * دلیل: بسته‌ی jalaliday نوع‌هایش را فقط از طریق فیلد `exports` (با پسوند
 * .d.mts) عرضه می‌کند، بدون fallback برای moduleResolution کلاسیک "Node"
 * (چیزی که apps/api چون NestJS/CommonJS است از آن استفاده می‌کند). اگر این
 * فایل از باندل مشترک صادر شود، typecheck هر مصرف‌کننده‌ای — حتی
 * apps/api که اصلاً تاریخ فرمت نمی‌کند — با خطای resolve شکست می‌خورد.
 * فرمت تاریخ ذاتاً یک تابع لایه‌ی نمایش است (قاعده‌ی #۹) و فقط در
 * apps/web و apps/admin (هر دو با moduleResolution: Bundler) لازم است.
 */
import dayjs from "dayjs";
import jalaliday from "jalaliday/dayjs";
import { toPersianDigits } from "./digits";

dayjs.extend(jalaliday);

/**
 * تاریخ را به شمسی (جلالی) برای نمایش فرمت می‌کند. تبدیل تقویم توسط
 * jalaliday انجام می‌شود — طبق دستور T-005 تبدیل دستی نوشته نشده. خروجی
 * همیشه ارقام فارسی دارد (قاعده‌ی #۹، فقط لایه‌ی نمایش).
 */
export function formatDateFa(date: Date, pattern = "YYYY/MM/DD"): string {
  const formatted = dayjs(date).calendar("jalali").format(pattern);
  return toPersianDigits(formatted);
}
