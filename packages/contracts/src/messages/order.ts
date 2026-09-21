/**
 * واژه‌نامه‌ی مرکزی سفارش — قاعده‌ی §۲.۳۸ «یکپارچگی زبان»: هر مفهوم فقط با
 * یک عبارت، همه‌جا (Frontend، پنل ادمین، پیامک، ایمیل). `status` اینجا منبع
 * حقیقتِ رشته‌های نمایشی‌ست؛ enum واقعی دیتابیس در T-003 باید روی همین
 * کلیدها/ترتیب منطبق باشد — کد داخلی نباید در رابط مشتری دیده شود (§۲.۳۷).
 */

export const orderStatus = {
  registered: "ثبت شده",
  awaitingPayment: "در انتظار پرداخت",
  paymentConfirmed: "پرداخت تأیید شد",
  processing: "در حال پردازش",
  readyToShip: "آماده ارسال",
  shipped: "ارسال شد",
  delivered: "تحویل داده شد",
  cancelled: "لغو شد",
  returned: "مرجوع شد",
} as const;

export type OrderStatusKey = keyof typeof orderStatus;

export const orderConfirmation = {
  title: "سفارش شما با موفقیت ثبت شد.",
  orderCodeLabel: "کد سفارش:",
  detailsHint: "جزئیات سفارش در حساب کاربری شما قابل مشاهده است.",
  /** پیامک §۲.۲۰ — کد سفارش همیشه لاتین (قاعده‌ی #۹، §۴.۴۴). */
  smsTemplate: (orderCode: string) =>
    `سفارش شما در ArByte با موفقیت ثبت شد.\nکد سفارش: ${orderCode}`,
} as const;

export const paymentConfirmation = {
  title: "پرداخت سفارش شما تأیید شد.",
  processingHint: "سفارش شما وارد مرحله پردازش شده است.",
} as const;

export const orderShipped = {
  title: "سفارش شما ارسال شد.",
  methodLabel: "روش ارسال:",
  trackingCodeLabel: "کد پیگیری:",
  accountHint: "اطلاعات پیگیری سفارش در حساب کاربری شما نیز قابل مشاهده است.",
} as const;

export const orderDelay = {
  inProgress:
    "سفارش شما با کمی تأخیر در حال پردازش است. تیم ArByte در حال پیگیری وضعیت سفارش شماست.",
  needsReview:
    "برای تکمیل سفارش شما نیاز به بررسی بیشتری داریم. کارشناسان ArByte با شما تماس خواهند گرفت.",
} as const;
