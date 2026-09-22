import { z } from "zod";
import { successResponseSchema } from "../common/response";
import { MoneyAmountSchema } from "../validators";

export * from "./scrub-payload";

/**
 * درگاه پرداخت — الحاقیه T-004 §۷: فقط شکل، بدون منطق (مستندات بله‌پی
 * هنوز نرسیده). ⚠️ بازگشت مرورگر (`/payments/return/:provider`) هرگز
 * پرداخت را تأیید نمی‌کند — کاربر می‌تواند URL را دستکاری کند؛ تأیید فقط
 * از وب‌هوک (`/payments/callback/:provider`) یا verify سمت سرور است.
 * ⚠️ Idempotency: `providerRef` یکتاست؛ پردازش دوباره‌ی همان وب‌هوک نباید
 * سفارش را دوباره تأیید کند — مسئولیت پیاده‌سازی سرویس، نه این اسکیما.
 */

// POST /orders/:orderNumber/payment/initiate
export const InitiatePaymentResponseSchema = successResponseSchema(
  z.object({
    redirectUrl: z.string(),
    providerRef: z.string(),
  }),
);

// POST /payments/callback/:provider — بدنه‌ی وب‌هوک (شکل کلی؛ فیلدهای دقیق per-provider در مستندات بله‌پی)
export const PaymentCallbackBodySchema = z.object({
  providerRef: z.string(),
  status: z.enum(["SUCCESS", "FAILED"]),
  amount: MoneyAmountSchema,
  /** برای تأیید صحت فراخوانی (HMAC/امضای درگاه)؛ شکل دقیق پس از رسیدن مستندات. */
  signature: z.string().optional(),
});
export const PaymentCallbackResponseSchema = successResponseSchema(
  z.object({ received: z.boolean() }),
);

// GET /payments/return/:provider — بازگشت مرورگر کاربر (فقط UX، نه تأیید)
export const PaymentReturnQuerySchema = z.object({
  providerRef: z.string(),
  status: z.string().optional(),
});
export const PaymentReturnResponseSchema = successResponseSchema(
  z.object({
    orderNumber: z.string(),
    /** فقط برای نمایش «در حال بررسی...» به کاربر؛ وضعیت واقعی از وب‌هوک می‌آید. */
    pendingVerification: z.boolean(),
  }),
);
