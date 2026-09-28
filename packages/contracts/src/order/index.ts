import { z } from "zod";
import {
  successResponseSchema,
  paginatedResponseSchema,
} from "../common/response";
import { PaginationQuerySchema } from "../common/pagination";
import {
  OrderStatusSchema,
  PaymentMethodSchema,
  PaymentProviderSchema,
  PaymentStatusSchema,
  ReceiptStatusSchema,
  ReturnStatusSchema,
} from "../common/enums";
import { MoneyAmountSchema } from "../validators";

/**
 * سفارش — T-004 §۳ (سند اصلی) + §۵/۷ (الحاقیه: مشتق‌بودن status از
 * Payment.status؛ انتزاع درگاه). فقط قرارداد؛ منطق ثبت/محاسبه در سرویس
 * واقعی (به‌جز ماشین‌حالت، ر.ک. order/status-transitions.ts).
 */

export const OrderItemSchema = z.object({
  id: z.string(),
  variantId: z.string().nullable(),
  productName: z.string(),
  variantLabel: z.string().nullable(),
  sku: z.string(),
  unitPrice: MoneyAmountSchema,
  quantity: z.number().int().positive(),
  discount: MoneyAmountSchema.default(0),
  finalPrice: MoneyAmountSchema,
});

export const ShippingAddressSnapshotSchema = z.object({
  recipientName: z.string(),
  mobile: z.string(),
  province: z.string(),
  city: z.string(),
  addressLine: z.string(),
  postalCode: z.string().nullable(),
});

export const OrderPaymentSummarySchema = z.object({
  method: PaymentMethodSchema,
  provider: PaymentProviderSchema,
  status: PaymentStatusSchema,
});

export const OrderShipmentSummarySchema = z
  .object({
    provider: z.string(),
    trackingNumber: z.string().nullable(),
    trackingUrl: z.string().nullable(),
    shippedAt: z.string().datetime().nullable(),
    deliveredAt: z.string().datetime().nullable(),
  })
  .nullable();

export const OrderSchema = z.object({
  orderNumber: z.string(),
  /** §۸.۴۵/تصمیم ب T-003 — مستقل از paymentStatus، هرگز مستقیم از آن ست نمی‌شود. */
  status: OrderStatusSchema,
  paymentStatus: PaymentStatusSchema,
  items: z.array(OrderItemSchema),
  shippingAddress: ShippingAddressSnapshotSchema,
  subtotal: MoneyAmountSchema,
  discountTotal: MoneyAmountSchema,
  shippingCost: MoneyAmountSchema,
  finalTotal: MoneyAmountSchema,
  payment: OrderPaymentSummarySchema.nullable(),
  shipment: OrderShipmentSummarySchema,
  createdAt: z.string().datetime(),
});
export type Order = z.infer<typeof OrderSchema>;

/**
 * `POST /orders` — کاربر آدرس، روش پرداخت، و اختیاری روش ارسال/کد تخفیف
 * می‌فرستد (§۸.۵۵)؛ قیمت‌ها سرور از سبد فعلی بازمحاسبه می‌کند. اگر قیمت
 * زودتر عوض شده باشد، سرور خطای PRICE_CHANGED می‌دهد نه ثبت بی‌صدا با
 * قیمت جدید (T-004 بخش ۲، هشدار).
 *
 * ⚠️ D-05 §۲ سند تسک «نوع فاکتور (شخصی/شرکتی)» را هم جزو ورودی می‌شمارد
 * (طبق Checkout.dc.html)، اما Prisma's Order مدل هیچ فیلد فاکتور/شرکتی
 * ندارد (§۱ همین سند: «مدل طبق Prisma»). این تناقض حل‌نشده در
 * docs/QUESTIONS.md ثبت شده — عمداً اینجا اضافه نشده تا مدل از Prisma
 * منحرف نشود؛ صفحه‌ی Checkout واقعی بچ ۰۳ است.
 */
export const CreateOrderBodySchema = z.object({
  addressId: z.string(),
  paymentMethod: PaymentMethodSchema,
  shippingMethodId: z.string().optional(),
  couponCode: z.string().optional(),
});
export const CreateOrderResponseSchema = successResponseSchema(OrderSchema);

// GET /orders
export const OrderListQuerySchema = PaginationQuerySchema.extend({
  status: OrderStatusSchema.optional(),
});
export const OrderListResponseSchema = paginatedResponseSchema(OrderSchema);

// GET /orders/:orderNumber
export const OrderDetailResponseSchema = successResponseSchema(OrderSchema);

/**
 * `POST /orders/:orderNumber/receipt` — آپلود رسید (§۸.۴۷). خودِ فایل با
 * multipart می‌آید، نه JSON body؛ این اسکیما فقط متادیتای همراه را
 * اعتبارسنجی می‌کند. محدودیت نوع/حجم فایل با کدهای خطای
 * UPLOAD_TOO_LARGE/UPLOAD_INVALID_TYPE گزارش می‌شود (سند اصلی بخش ۲).
 */
export const UploadReceiptBodySchema = z.object({
  amount: MoneyAmountSchema,
});
export const PaymentReceiptSchema = z.object({
  id: z.string(),
  fileUrl: z.string(),
  amount: MoneyAmountSchema,
  status: ReceiptStatusSchema,
  uploadedAt: z.string().datetime(),
});
export const UploadReceiptResponseSchema =
  successResponseSchema(PaymentReceiptSchema);

/**
 * `POST /orders/track` — پیگیری مهمان (§۵). عمومی، محدودیت نرخ سخت
 * (rate-limit.ts's `order_track`). پاسخ خطا برای «سفارش نیست» و «موبایل
 * نمی‌خورد» عمداً یکسان است (NOT_FOUND) تا شماره‌ی سفارش قابل حدس‌زدن
 * نباشد — این یکسانی مسئولیت سرویس است، نه این اسکیما.
 */
export const TrackOrderBodySchema = z.object({
  orderNumber: z.string(),
  mobile: z.string(),
});
export const TrackOrderResponseSchema = successResponseSchema(OrderSchema);

/**
 * `POST /orders/:orderNumber/return` — مرجوعی قلم‌به‌قلم (§۵)، فقط سفارش
 * DELIVERED در بازه‌ی `storeFacts.policies.returnDays`. خارج از بازه →
 * RETURN_WINDOW_EXPIRED؛ سفارش نامناسب (غیر DELIVERED) → RETURN_NOT_ELIGIBLE.
 */
export const CreateReturnRequestBodySchema = z.object({
  reason: z.string().min(1),
  description: z.string().optional(),
  items: z
    .array(
      z.object({
        orderItemId: z.string(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});
export const ReturnRequestSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  status: ReturnStatusSchema,
  reason: z.string(),
  createdAt: z.string().datetime(),
});
export const CreateReturnRequestResponseSchema =
  successResponseSchema(ReturnRequestSchema);

export * from "./status-transitions";
