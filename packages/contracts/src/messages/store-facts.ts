/**
 * T-210 §۵ — واقعیت‌های فروشگاه، یک جا. متن طراحی پر از سیاست و عدد است
 * (ارسال رایگان، مرجوعی، ساعت قطع ارسال، گارانتی، تعویض، آمار سفارش/رضایت)
 * که قبلاً می‌توانست در ده کامپوننت جدا هاردکد شود. `policies` از
 * `Home.dc.html`/`Product.dc.html`/`Legal.dc.html` عیناً برداشته شده
 * (ر.ک. docs/QUESTIONS.md Q-3 برای منبع هر عدد).
 *
 * مقدار `null` یعنی آن تکه‌ی رابط کاربری **پنهان** می‌شود — نه صفر، نه خط
 * تیره. آمار ساختگی (مثلاً سه عدد نمونه‌ی بخش Community در Home.dc.html)
 * روی سایت فروشگاه تازه‌کار نقض بند ۲.۲۶ برند بوک است؛ برای همین
 * `support.*`/`stats.*` عمداً `null` مانده‌اند تا مدیر پروژه پرشان کند.
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
    deliveredOrders: null as number | null,
    satisfactionPercent: null as number | null,
    yearsActive: null as number | null,
  },
} as const;

export type StoreFacts = typeof storeFacts;
