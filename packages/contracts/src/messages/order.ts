/**
 * واژه‌نامه‌ی مرکزی سفارش — قاعده‌ی §۲.۳۸ «یکپارچگی زبان»: هر مفهوم فقط با
 * یک عبارت، همه‌جا (Frontend، پنل ادمین، پیامک، ایمیل). `orderStatus` اینجا
 * منبع حقیقتِ رشته‌های نمایشی‌ست؛ enum واقعی دیتابیس در T-003
 * (`OrderStatus` در schema.prisma) باید روی همین کلیدها/ترتیب منطبق باشد —
 * کد داخلی نباید در رابط مشتری دیده شود (§۲.۳۷).
 *
 * برند بوک در بندهای §۷.۴۸، §۱۱.۵۰ و §۲.۳۷ سه لیست متفاوت داده. T-003 آن‌ها
 * را در یک لیست نهایی جمع کرد (سند `T-003-data-model.md`، بخش «الف»):
 * `PAYMENT_REVIEW` از §۷.۴۸ اضافه شد، و «مرجوع شد» حذف شد چون Return طبق
 * §۸.۵۲ یک موجودیت جداست (سفارش می‌تواند تحویل‌شده باشد و فقط یک قلمش
 * مرجوع شود) — به‌جایش `returnStatus` پایین‌تر تعریف شده.
 */

export const orderStatus = {
  registered: "ثبت شده",
  awaitingPayment: "در انتظار پرداخت",
  paymentReview: "در حال بررسی پرداخت",
  paymentConfirmed: "پرداخت تأیید شد",
  processing: "در حال پردازش",
  readyToShip: "آماده ارسال",
  shipped: "ارسال شد",
  delivered: "تحویل داده شد",
  cancelled: "لغو شد",
} as const;

export type OrderStatusKey = keyof typeof orderStatus;

/**
 * E-05 §۱ — نگاشت مقدار enum دیتابیس (`OrderStatusSchema`،
 * `common/enums.ts`) به کلید `orderStatus` بالا. کد داخلی (`"PAID"`) نباید
 * مستقیم در UI ظاهر شود (§۲.۳۷) — همیشه از این نگاشت رد شود.
 */
export const ORDER_STATUS_DB_TO_KEY = {
  PENDING: "registered",
  AWAITING_PAYMENT: "awaitingPayment",
  PAYMENT_REVIEW: "paymentReview",
  PAID: "paymentConfirmed",
  PROCESSING: "processing",
  READY_TO_SHIP: "readyToShip",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const satisfies Record<string, OrderStatusKey>;

export function orderStatusLabel(dbStatus: string): string {
  const key = (ORDER_STATUS_DB_TO_KEY as Record<string, OrderStatusKey>)[
    dbStatus
  ];
  return key ? orderStatus[key] : dbStatus;
}

/**
 * وضعیت مرجوعی — موجودیت جداگانه از سفارش (§۸.۵۲). برند بوک فقط می‌گوید
 * Return یک فیلد «Status» دارد، مقادیرش را مشخص نکرده؛ این فهرست یک
 * جریان استاندارد مرجوعی است (تصمیم T-003، نه نقل‌قول مستقیم برند بوک).
 */
export const returnStatus = {
  requested: "درخواست ثبت شد",
  approved: "درخواست تأیید شد",
  rejected: "درخواست رد شد",
  received: "کالا دریافت شد",
  refunded: "مبلغ بازگردانده شد",
} as const;

export type ReturnStatusKey = keyof typeof returnStatus;

/**
 * وضعیت پرداخت — مستقل از وضعیت سفارش (§۷.۴۹، تصمیم ب در T-003:
 * Order.status هرگز مستقیم از این مشتق نمی‌شود). دقیقاً با `PaymentStatus`
 * در schema.prisma منطبق است.
 */
export const paymentStatus = {
  unpaid: "در انتظار پرداخت",
  receiptUploaded: "رسید ارسال شده",
  underReview: "در حال بررسی",
  confirmed: "تأیید شده",
} as const;

export type PaymentStatusKey = keyof typeof paymentStatus;

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
