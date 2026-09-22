import { z } from "zod";
import {
  successResponseSchema,
  paginatedResponseSchema,
} from "../common/response";
import { PaginationQuerySchema } from "../common/pagination";
import {
  PaymentMethodSchema,
  PaymentProviderSchema,
  PaymentStatusSchema,
  ReceiptStatusSchema,
} from "../common/enums";
import { MoneyAmountSchema } from "../validators";

export const AdminPaymentSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  orderNumber: z.string(),
  method: PaymentMethodSchema,
  provider: PaymentProviderSchema,
  status: PaymentStatusSchema,
  amount: MoneyAmountSchema,
  providerRef: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export const AdminPaymentListQuerySchema = PaginationQuerySchema.extend({
  status: PaymentStatusSchema.optional(),
});
export const AdminPaymentListResponseSchema =
  paginatedResponseSchema(AdminPaymentSchema);

/** §۸.۴۷/۴۸ — بررسی رسید پرداخت دستی. */
export const AdminPaymentReceiptSchema = z.object({
  id: z.string(),
  paymentId: z.string(),
  userId: z.string(),
  fileUrl: z.string(),
  amount: MoneyAmountSchema,
  uploadedAt: z.string().datetime(),
  status: ReceiptStatusSchema,
  reviewedByUserId: z.string().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  rejectionReason: z.string().nullable(),
});
export const AdminPaymentReceiptListResponseSchema = successResponseSchema(
  z.array(AdminPaymentReceiptSchema),
);

/**
 * `PATCH /admin/payments/receipts/:id` — تأیید/رد رسید. تأیید یعنی
 * Payment.status → CONFIRMED که به‌نوبه‌ی خود Order.status را (طبق تصمیم
 * ب، T-003) مشتق می‌کند؛ اینجا فقط قرارداد، منطق سرویس در پیاده‌سازی است.
 */
export const ReviewReceiptBodySchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("APPROVE") }),
  z.object({
    decision: z.literal("REJECT"),
    rejectionReason: z.string().min(1),
  }),
]);
