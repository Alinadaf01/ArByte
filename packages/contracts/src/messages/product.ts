/**
 * متن‌های مرتبط با محصول — وضعیت کالا (§۶.۱۳)، حالت خالیِ نتایج جستجو (§۵.۴۵).
 */

export const condition = {
  sealed: "آکبند",
  openBox: "Open Box",
  stock: "استوک",
  likeNew: "در حد نو",
} as const;

export type ProductCondition = keyof typeof condition;

export const searchEmptyState = {
  title: "محصولی با این مشخصات پیدا نشد.",
  description: "فیلترها را تغییر دهید یا جستجوی دیگری انجام دهید.",
  clearFiltersCta: "حذف فیلترها",
} as const;
