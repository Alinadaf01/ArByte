import { toPersianDigits } from "./digits";
import { groupThousands } from "./money";

/**
 * عدد عمومی (غیرقیمتی — مثلاً موجودی، تعداد بازدید) را برای نمایش فرمت
 * می‌کند: گروه‌بندی هزارگان با جداکننده‌ی درست + ارقام فارسی. برای مبلغ از
 * formatPrice/formatMoney استفاده کنید، نه این تابع (قاعده‌ی #۷).
 */
export function formatNumberFa(n: number): string {
  if (!Number.isInteger(n)) {
    throw new RangeError("formatNumberFa فقط عدد صحیح می‌پذیرد");
  }
  return toPersianDigits(groupThousands(n.toString()));
}
