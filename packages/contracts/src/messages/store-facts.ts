/**
 * T-210 §۵ — واقعیت‌های فروشگاه، یک جا. متن طراحی پر از سیاست و عدد است
 * (ارسال رایگان، مرجوعی، ساعت قطع ارسال، گارانتی، تعویض، آمار سفارش/رضایت)
 * که قبلاً می‌توانست در ده کامپوننت جدا هاردکد شود. `policies` از
 * `Home.dc.html`/`Product.dc.html`/`Legal.dc.html` عیناً برداشته شده
 * (ر.ک. docs/QUESTIONS.md Q-3 برای منبع هر عدد).
 *
 * مقدار `null` یعنی آن تکه‌ی رابط کاربری **پنهان** می‌شود — نه صفر، نه خط
 * تیره. `stats.*` قبلاً عمداً `null` بود (بند ۲.۲۶ — بدون آمار ساختگی)؛
 * E-01 §۳ اعداد واقعی تأییدشده‌ی مدیر پروژه را داد، ردیف آمار صفحه اصلی
 * حالا دیده می‌شود. `activeSinceYear` (نه یک شمارنده‌ی «سال‌های فعالیت»)
 * عمدی است — «از ۱۴۰۰» با گذر زمان کهنه نمی‌شود، برخلاف یک عدد ثابت سال.
 */
export const storeFacts = {
  policies: {
    freeShippingMinToman: 50_000_000,
    returnDays: 7,
    sameDayCutoffHour: 14,
    tehranDeliveryDays: 1,
    provinceDeliveryDays: [2, 3] as [number, number],
    replacementDays: 3,
    /** «۲۴ ماه گارانتی رسمی شرکتی» — Product.dc.html/Search.dc.html. */
    warrantyMonths: 24,
  },
  support: {
    hours: { from: 9, to: 21 },
    phone: null as string | null,
    avgResponseMinutes: null as number | null,
  },
  stats: {
    deliveredOrders: 300 as number | null,
    satisfactionPercent: 95 as number | null,
    activeSinceYear: 1400 as number | null,
  },
} as const;

export type StoreFacts = typeof storeFacts;
