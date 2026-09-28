/**
 * محدودیت‌های نرخ درخواست — T-004 §۵ (بندهای ۱۱.۱۴، ۸.۶، ۶.۴۱). برند بوک
 * عدد نداده؛ این‌ها پیش‌فرض *قابل‌پیکربندی*اند (مثلاً از `Setting` یا env
 * در پیاده‌سازی واقعی خوانده شوند)، نه ثابت‌های سخت‌کد‌شده.
 *
 * ⚠️ این فقط امنیت نیست — هزینه‌ی پیامک کاوه‌نگار واقعی است؛ بدون محدودیت
 * OTP، یک اسکریپت ساده می‌تواند اعتبار پیامکی را خالی کند.
 */
export interface RateLimitRule {
  limit: number;
  windowSeconds: number;
  scope: "mobile" | "ip" | "user";
}

export const RATE_LIMITS = {
  otpRequestPerMobile: { limit: 3, windowSeconds: 10 * 60, scope: "mobile" },
  otpRequestPerIp: { limit: 10, windowSeconds: 60 * 60, scope: "ip" },
  adminLoginPerIp: { limit: 5, windowSeconds: 15 * 60, scope: "ip" },
  publicApiPerIp: { limit: 100, windowSeconds: 60, scope: "ip" },
  uploadPerUser: { limit: 20, windowSeconds: 60 * 60, scope: "user" },
  /** D-05 §۵ — پیگیری مهمان عمومی است؛ بدون این، شماره‌ی سفارش قابل حدس‌زدن می‌شود. */
  orderTrackPerIp: { limit: 10, windowSeconds: 60 * 60, scope: "ip" },
} as const satisfies Record<string, RateLimitRule>;

/** به ازای هر کد OTP (نه در یک بازه‌ی زمانی — عمرش با otpCodeTtlSeconds محدود است). */
export const OTP_VERIFY_MAX_ATTEMPTS = 5;

/** اعتبار کد OTP — پس از این، OTP_EXPIRED (نه OTP_INVALID). */
export const OTP_CODE_TTL_SECONDS = 5 * 60;
