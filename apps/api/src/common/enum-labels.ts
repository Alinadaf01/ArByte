/**
 * نگاشت صریح و تام (exhaustive) بین enumهای Prisma و برچسب‌های فارسی
 * `@arbyte/contracts` — تصمیم T-003-DECISION.
 *
 * چرا این فایل لازم است: کلیدهای این دو طرف عمداً یکسان نیستند (مثلاً
 * `OrderStatus.PENDING` در برابر `orderStatus.registered`، یا
 * `ProductCondition.NEW` در برابر `condition.sealed`) — قرارداد نام‌گذاری
 * هرکدام (UPPER_SNAKE در Prisma enum، camelCase معناگرا در پیام‌های
 * مشتری) جدا از دیگری انتخاب شده. اگر جایی از کد به‌جای این نگاشتِ صریح،
 * یک تبدیل ضمنی (مثلاً حدس زدن camelCase از روی enum) بسازد، برای اکثر
 * مقادیر کار می‌کند و برای بقیه بی‌صدا `undefined` می‌دهد — دقیقاً همان
 * دسته باگی که CSP در T-100 بود: چیزی که تست استاتیک نمی‌گیرد.
 *
 * `Record<PrismaEnum, string>` این را در زمان کامپایل غیرممکن می‌کند: اگر
 * enum مقدار جدیدی بگیرد و اینجا اضافه نشود، بیلد می‌شکند.
 */
import {
  OrderStatus,
  PaymentStatus,
  ProductCondition,
  ReturnStatus,
} from "../../prisma/generated/prisma/client";
import {
  condition,
  inventory,
  orderStatus,
  paymentStatus,
  returnStatus,
} from "@arbyte/contracts";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: orderStatus.registered,
  AWAITING_PAYMENT: orderStatus.awaitingPayment,
  PAYMENT_REVIEW: orderStatus.paymentReview,
  PAID: orderStatus.paymentConfirmed,
  PROCESSING: orderStatus.processing,
  READY_TO_SHIP: orderStatus.readyToShip,
  SHIPPED: orderStatus.shipped,
  DELIVERED: orderStatus.delivered,
  CANCELLED: orderStatus.cancelled,
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: paymentStatus.unpaid,
  RECEIPT_UPLOADED: paymentStatus.receiptUploaded,
  UNDER_REVIEW: paymentStatus.underReview,
  CONFIRMED: paymentStatus.confirmed,
};

export const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  REQUESTED: returnStatus.requested,
  APPROVED: returnStatus.approved,
  REJECTED: returnStatus.rejected,
  RECEIVED: returnStatus.received,
  REFUNDED: returnStatus.refunded,
};

export const PRODUCT_CONDITION_LABEL: Record<ProductCondition, string> = {
  NEW: condition.sealed,
  OPEN_BOX: condition.openBox,
  STOCK: condition.stock,
  LIKE_NEW: condition.likeNew,
};

/**
 * §۷.۳۸ — بر خلاف enumهای بالا، این یکی در Prisma ذخیره نشده (تصمیم T-003
 * در docs/data-model.md: وضعیت موجودی از quantity/reservedQuantity/
 * lowStockThreshold مشتق می‌شود، نه یک ستون جدا — تا دو منبع حقیقت نداشته
 * باشیم). محاسبه‌ی واقعی‌اش (کدام آستانه، چه زمانی Preorder) منطق سرویس
 * است و کار T-004 است؛ اینجا فقط شکل نوع + برچسب.
 */
export type StockStatus =
  "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "PREORDER";

export const STOCK_STATUS_VALUES: readonly StockStatus[] = [
  "IN_STOCK",
  "LOW_STOCK",
  "OUT_OF_STOCK",
  "PREORDER",
];

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  IN_STOCK: inventory.inStock,
  LOW_STOCK: inventory.limitedStock,
  OUT_OF_STOCK: inventory.outOfStock,
  PREORDER: inventory.comingSoon,
};
