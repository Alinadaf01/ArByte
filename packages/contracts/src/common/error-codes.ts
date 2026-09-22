import { z } from "zod";

/**
 * فهرست کامل کدهای خطا — T-004 بخش ۲ (سند اصلی) + بخش ۱۰ (الحاقیه).
 * `code` انگلیسی و ماشین‌خوان است، هرگز مستقیم به کاربر نشان داده نمی‌شود؛
 * `message` (پایین) همیشه فارسی و آماده‌ی نمایش است (بند ۸.۹۳).
 */
export const ERROR_CODES = [
  // سند اصلی، بخش ۲
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "OTP_INVALID",
  "OTP_EXPIRED",
  "OTP_MAX_ATTEMPTS",
  "INSUFFICIENT_STOCK",
  "PRICE_CHANGED",
  "CART_EMPTY",
  "ORDER_NOT_MODIFIABLE",
  "PAYMENT_ALREADY_CONFIRMED",
  "UPLOAD_TOO_LARGE",
  "UPLOAD_INVALID_TYPE",
  "INTERNAL_ERROR",
  "SERVICE_UNAVAILABLE",
  // الحاقیه، بخش ۱۰
  "VARIANT_NOT_FOUND",
  "VARIANT_UNAVAILABLE",
  "INVALID_STATUS_TRANSITION",
  "IMPERSONATION_TICKET_INVALID",
  "IMPERSONATION_TICKET_EXPIRED",
  "IMPERSONATION_TICKET_USED",
  "IMPERSONATION_FORBIDDEN_ACTION",
  "GATEWAY_ERROR",
  "GATEWAY_TIMEOUT",
  "GATEWAY_AMOUNT_MISMATCH",
] as const;

export const ErrorCodeSchema = z.enum(ERROR_CODES);
export type ErrorCode = (typeof ERROR_CODES)[number];

/**
 * پیام فارسی پیش‌فرض هر کد — لحن بند ۲.۱۸ (محترمانه، راه‌حل‌محور، بدون
 * سرزنش) و الگوی «مشکل + راهنمایی» بند ۶.۷۶. این پیام پیش‌فرض است؛ لایه‌ی
 * سرویس (T-004 بعدی/سرویس‌ها) می‌تواند برای یک مورد خاص پیام دقیق‌تری
 * جایگزین کند (مثلاً fieldErrors برای VALIDATION_ERROR).
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR:
    "اطلاعات واردشده معتبر نیست. لطفاً موارد مشخص‌شده را بررسی کنید.",
  UNAUTHORIZED: "برای این عملیات باید وارد حساب کاربری خود شوید.",
  FORBIDDEN: "شما دسترسی لازم برای این عملیات را ندارید.",
  NOT_FOUND: "موردی با این مشخصات پیدا نشد.",
  CONFLICT: "این عملیات با وضعیت فعلی سیستم سازگار نیست.",
  RATE_LIMITED:
    "تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.",
  OTP_INVALID: "کد واردشده صحیح نیست.",
  OTP_EXPIRED: "کد واردشده منقضی شده است. کد جدید درخواست کنید.",
  OTP_MAX_ATTEMPTS:
    "تعداد تلاش‌های مجاز برای این کد به پایان رسید. کد جدید درخواست کنید.",
  INSUFFICIENT_STOCK: "موجودی این محصول کافی نیست.",
  PRICE_CHANGED:
    "قیمت این محصول تغییر کرده است. لطفاً سبد خرید را بررسی و دوباره تلاش کنید.",
  CART_EMPTY: "سبد خرید شما خالی است.",
  ORDER_NOT_MODIFIABLE: "این سفارش دیگر قابل تغییر نیست.",
  PAYMENT_ALREADY_CONFIRMED: "پرداخت این سفارش قبلاً تأیید شده است.",
  UPLOAD_TOO_LARGE: "حجم فایل بیش از حد مجاز است.",
  UPLOAD_INVALID_TYPE: "نوع فایل مجاز نیست.",
  INTERNAL_ERROR:
    "خطای غیرمنتظره‌ای رخ داد. تیم فنی مطلع شد؛ لطفاً کمی بعد دوباره تلاش کنید.",
  SERVICE_UNAVAILABLE:
    "سرویس موقتاً در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید.",
  VARIANT_NOT_FOUND: "این پیکربندی محصول پیدا نشد.",
  VARIANT_UNAVAILABLE: "این پیکربندی محصول در حال حاضر موجود نیست.",
  /** عین متن الحاقیه، بخش ۵. */
  INVALID_STATUS_TRANSITION: "این تغییر وضعیت مجاز نیست.",
  IMPERSONATION_TICKET_INVALID: "بلیت ورود معتبر نیست.",
  IMPERSONATION_TICKET_EXPIRED: "بلیت ورود منقضی شده است.",
  IMPERSONATION_TICKET_USED: "این بلیت ورود قبلاً استفاده شده است.",
  /** عین متن الحاقیه، بخش ۶. */
  IMPERSONATION_FORBIDDEN_ACTION:
    "در حالت مشاهده‌ی حساب مشتری، این عملیات مجاز نیست.",
  GATEWAY_ERROR: "پرداخت با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
  GATEWAY_TIMEOUT: "درگاه پرداخت پاسخ نداد. لطفاً دوباره تلاش کنید.",
  GATEWAY_AMOUNT_MISMATCH: "مبلغ پرداختی با مبلغ سفارش مطابقت ندارد.",
};

/**
 * §۸.۹۳ — ساختار پاسخ خطا. `code` HTTP status را جایگزین نمی‌کند؛ فیلتر
 * استثنای سراسری (AllExceptionsFilter، T-000) همچنان status code واقعی را
 * ست می‌کند، این فقط بدنه‌ی JSON است.
 */
export const ApiErrorSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  fieldErrors: z.record(z.string(), z.string()).optional(),
  requestId: z.string(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
