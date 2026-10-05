import { z } from "zod";
import { successResponseSchema } from "../common/response";
import { PaymentMethodSchema, PaymentPlanSchema } from "../common/enums";
import { MoneyAmountSchema, MoneyOrZeroSchema } from "../validators";

export * from "./scrub-payload";

/**
 * `GET /payment-methods` — E-02 §۴. فهرست واقعاً در دسترس، نه همه‌ی
 * گزینه‌های طراحی‌شده: کارت‌به‌کارت فقط اگر SiteSettings کامل پر شده،
 * درگاه فقط اگر حداقل یک ApiCredential فعال با credentials معتبر داشته
 * باشد (apps/public_api/checkout_views.py's PaymentMethodListView). چهارتای
 * غیر از بله‌پی همیشه در عمل غایب‌اند (مستندات نرسیده) — این enum اسمی
 * وسیع‌تر است تا اگر یکی مستند شد، قرارداد از قبل جا داشته باشد.
 */
export const GATEWAY_CODE_VALUES = [
  "ZARINPAL",
  "IDPAY",
  "SNAPPPAY",
  "DIGIPAY",
  "BALEPAY",
] as const;
export const GatewayCodeSchema = z.enum(GATEWAY_CODE_VALUES);
export type GatewayCode = z.infer<typeof GatewayCodeSchema>;

export const PaymentMethodOptionSchema = z.object({
  method: PaymentMethodSchema,
  provider: GatewayCodeSchema.nullable(),
  label: z.string(),
});
export const PaymentMethodListResponseSchema = successResponseSchema(
  z.array(PaymentMethodOptionSchema),
);

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

/** AUDIT-2 — `GET /payment-plans`: سه روش برای جمع سبد همین کاربر (سمت سرور). */
export const PaymentPlanOptionSchema = z.object({
  plan: PaymentPlanSchema,
  available: z.boolean(),
  reason: z.string().nullable(),
  onlineAmount: MoneyOrZeroSchema,
  bankAmount: MoneyOrZeroSchema,
});
export const PaymentPlanListResponseSchema = successResponseSchema(
  z.object({
    total: MoneyAmountSchema,
    onlineLimit: MoneyAmountSchema,
    plans: z.array(PaymentPlanOptionSchema),
  }),
);

/** AUDIT-2 — `POST /orders/:n/payment/online`: لینک یک‌بارمصرف ربات بله. */
export const StartOnlinePaymentResponseSchema = successResponseSchema(
  z.object({
    deepLink: z.string().url(),
    amount: MoneyAmountSchema,
    expiresAt: z.string().datetime({ offset: true }),
  }),
);
