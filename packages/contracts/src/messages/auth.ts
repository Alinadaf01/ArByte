/**
 * پیام‌های احراز هویت — لحن OTP §۲.۱۹ (کوتاه، کاربردی، بدون تبلیغ)،
 * لحن خطا §۲.۱۸ (بدون سرزنش کاربر + راه‌حل).
 */

import { toPersianDigits } from "../format/digits";

export const otp = {
  /**
   * ورودی `code` همیشه لاتین (داده‌ی ساختاری تولیدشده در سرور، قاعده‌ی #۹).
   * نمونه‌ی §۲.۱۹ («کد ورود شما به ArByte: ۵۸۳۲») رقم فارسی نشان می‌دهد —
   * این تابع خودِ رشته‌ی پیامکِ نمایشی را می‌سازد، پس تبدیل اینجا انجام
   * می‌شود؛ کد خام (لاتین) هرگز از این تابع بیرون نمی‌رود.
   */
  messageTemplate: (code: string) =>
    `کد ورود شما به ArByte: ${toPersianDigits(code)}`,
  disclaimer: "این کد را در اختیار دیگران قرار ندهید.",
} as const;

export const authErrors = {
  invalidMobile: "شماره موبایل واردشده صحیح نیست.",
  mobileGuidance: "شماره موبایل را بررسی کنید و دوباره تلاش کنید.",
} as const;

/** F-04 — نوار هشدار سشن Impersonation (ادمین در حال مشاهده به‌جای مشتری). */
export const impersonationBanner = {
  viewingAs: (customer: string) => `در حال مشاهده به‌جای ${customer}`,
  by: (admin: string) => `توسط ${admin}`,
  exit: "خروج",
} as const;
