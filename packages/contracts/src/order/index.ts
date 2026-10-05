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
  PaymentPlanSchema,
  ReceiptStatusSchema,
  ReturnStatusSchema,
} from "../common/enums";
import { MoneyAmountSchema, MoneyOrZeroSchema } from "../validators";

/**
 * سفارش — T-004 §۳ (سند اصلی) + §۵/۷ (الحاقیه: مشتق‌بودن status از
 * Payment.status؛ انتزاع درگاه). فقط قرارداد؛ منطق ثبت/محاسبه در سرویس
 * واقعی (به‌جز ماشین‌حالت، ر.ک. order/status-transitions.ts).
 */

/**
 * E-03 §۳/۴ — یک ردیف سریال/شناسه‌ی گارانتی به ازای هر واحد. فقط در
 * `GET /orders/:orderNumber` پر می‌شود (مالک سفارش) — فهرست/پیگیری مهمان
 * این فیلد را برنمی‌گردانند (نه اینکه نداشته باشند، `units` در آن پاسخ‌ها
 * `undefined` است، نه آرایه‌ی خالی).
 */
export const OrderItemUnitSchema = z.object({
  serialNumber: z.string().nullable(),
  certificateId: z.string(),
});

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
  units: z.array(OrderItemUnitSchema).optional(),
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

/** AUDIT-2 — یک سهم پرداخت (آنلاین یا واریز) از سفارش. */
export const OrderPaymentLineSchema = z.object({
  id: z.string(),
  method: PaymentMethodSchema,
  provider: PaymentProviderSchema,
  status: PaymentStatusSchema,
  amount: MoneyAmountSchema,
  paidAt: z.string().datetime({ offset: true }).nullable(),
});
export type OrderPaymentLine = z.infer<typeof OrderPaymentLineSchema>;

export const OrderPaymentBreakdownSchema = z.object({
  plan: PaymentPlanSchema,
  total: MoneyAmountSchema,
  paid: MoneyOrZeroSchema,
  remaining: MoneyOrZeroSchema,
  onlinePaid: MoneyOrZeroSchema,
  bankPaid: MoneyOrZeroSchema,
});
export type OrderPaymentBreakdown = z.infer<typeof OrderPaymentBreakdownSchema>;

/**
 * E-05 §۱ — «اطلاعات حساب از API، نه هاردکد». فقط وقتی `payment.method`
 * سفارش `MANUAL_CARD_TO_CARD` است پر می‌شود (`SiteSettings.card_to_card_*`)،
 * وگرنه `null`. فقط روی `OrderSchema` (مالک واردشده) است، هرگز روی
 * `GuestOrderSchema` (پیگیری مهمان بلوک واریز نشان نمی‌دهد).
 */
export const CardToCardAccountSchema = z
  .object({
    cardNumber: z.string(),
    sheba: z.string(),
    holderName: z.string(),
  })
  .nullable();

/**
 * فاکتور — E-02 §۴ (Checkout.dc.html: تاگل شخصی/حقوقی). شخصی هیچ فیلد
 * تکمیلی ندارد؛ حقوقی نام‌شرکت/شناسه‌ملی الزامی، کد‌اقتصادی/شماره‌ثبت
 * اختیاری‌اند — همان اعتبارسنجی سرور (apps/orders/services.py's checkout()).
 */
export const InvoiceTypeSchema = z.enum(["PERSONAL", "CORPORATE"]);
export type InvoiceType = z.infer<typeof InvoiceTypeSchema>;

export const OrderInvoiceSchema = z.object({
  type: InvoiceTypeSchema,
  companyName: z.string().nullable(),
  nationalId: z.string().nullable(),
  economicCode: z.string().nullable(),
  registrationNumber: z.string().nullable(),
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
  invoice: OrderInvoiceSchema,
  payment: OrderPaymentSummarySchema.nullable(),
  cardToCardAccount: CardToCardAccountSchema,
  /** AUDIT-2 §۶ — ترکیب پرداخت (اختیاری برای سازگاری با پاسخ‌های کش‌شده‌ی قدیمی). */
  paymentPlan: PaymentPlanSchema.optional(),
  payments: z.array(OrderPaymentLineSchema).optional(),
  paymentBreakdown: OrderPaymentBreakdownSchema.optional(),
  shipment: OrderShipmentSummarySchema,
  createdAt: z.string().datetime(),
});
export type Order = z.infer<typeof OrderSchema>;

/**
 * `POST /orders` — کاربر آدرس، روش پرداخت، و اختیاری روش ارسال/کد تخفیف/
 * فاکتور می‌فرستد (§۸.۵۵)؛ قیمت‌ها سرور از سبد فعلی بازمحاسبه می‌کند. اگر
 * قیمت زودتر عوض شده باشد، سرور خطای PRICE_CHANGED می‌دهد نه ثبت بی‌صدا با
 * قیمت جدید (T-004 بخش ۲، هشدار). shippingMethodId/couponCode نبودن یعنی
 * سرور به انتخاب ذخیره‌شده روی سبد برمی‌گردد (E-02 §۴).
 *
 * فیلدهای فاکتور (نوع شخصی/شرکتی) که در D-05 هنوز حل‌نشده مانده بود
 * (docs/QUESTIONS.md Q-22) با E-02 اضافه شدند — یک migration جدید،
 * Prisma دیگر مرجع نیست (D-01 به بعد Django/apps.orders.models است).
 *
 * `idempotencyKey` بدنه نیست — هدر `Idempotency-Key` است (کلیک دوم روی
 * «ثبت سفارش» در شبکه‌ی کند نباید سفارش تکراری بسازد).
 */
export const CreateOrderBodySchema = z
  .object({
    addressId: z.string(),
    /** AUDIT-2 — سه روش؛ سرور سقف/فعال‌بودن را اجبار می‌کند. */
    paymentPlan: PaymentPlanSchema.optional(),
    /** قدیمی: MANUAL_CARD_TO_CARD → BANK_TRANSFER، GATEWAY → ONLINE. */
    paymentMethod: PaymentMethodSchema.optional(),
    shippingMethodId: z.string().optional(),
    couponCode: z.string().optional(),
    invoiceType: InvoiceTypeSchema.default("PERSONAL"),
    companyName: z.string().optional(),
    nationalId: z.string().length(11).optional(),
    economicCode: z.string().optional(),
    registrationNumber: z.string().optional(),
  })
  .refine((body) => !!body.paymentPlan || !!body.paymentMethod, {
    message: "روش پرداخت را انتخاب کنید.",
    path: ["paymentPlan"],
  })
  .refine(
    (body) =>
      body.invoiceType !== "CORPORATE" ||
      (!!body.companyName && !!body.nationalId),
    {
      message: "برای فاکتور حقوقی، نام شرکت و شناسه ملی الزامی است.",
      path: ["companyName"],
    },
  );
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

/**
 * E-05 §۲ — حریم خصوصی: مهمان (بدون ورود) فقط شهر مقصد را می‌بیند، نه
 * نشانی کامل (`ShippingAddressSnapshotSchema`ی کامل مخصوص مالک واردشده‌ی
 * سفارش است، `GET /orders/:orderNumber`). فاکتور/روش‌پرداخت هم عمداً حذف
 * شدند — کاربرد UI پیگیری مهمان به آن‌ها نیاز ندارد. `units` هرگز اینجا
 * نیست (همان قاعده‌ی سریال فقط برای مالک، E-03/E-04).
 */
export const GuestOrderSchema = z.object({
  orderNumber: z.string(),
  status: OrderStatusSchema,
  paymentStatus: PaymentStatusSchema,
  items: z.array(OrderItemSchema),
  shippingCity: z.string(),
  subtotal: MoneyAmountSchema,
  discountTotal: MoneyAmountSchema,
  shippingCost: MoneyAmountSchema,
  finalTotal: MoneyAmountSchema,
  shipment: OrderShipmentSummarySchema,
  createdAt: z.string().datetime(),
});
export type GuestOrder = z.infer<typeof GuestOrderSchema>;
export const TrackOrderResponseSchema = successResponseSchema(GuestOrderSchema);

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
