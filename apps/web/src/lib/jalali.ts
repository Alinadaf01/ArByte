import { formatDateFa } from "@arbyte/contracts/date";

const MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

/** «۲۷ شهریور ۱۴۰۴» — قالب تاریخ طراحی بلاگ. */
export function formatJalaliLong(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  const [y, m, d] = formatDateFa(date, "YYYY-M-D").split("-");
  const monthIndex =
    Number(m!.replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))) - 1;
  return `${d} ${MONTHS[monthIndex]} ${y}`;
}
