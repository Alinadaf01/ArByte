import type { OrderStatus } from "../common/enums";
import { ORDER_STATUS_VALUES } from "../common/enums";

/**
 * جدول گذارهای مجاز وضعیت سفارش — عیناً از `docs/data-model.md` (که خودش
 * از جدول ۹×۹ سند T-003 آمده). الحاقیه T-004 بخش ۵: «اینجا اجرا می‌شود» —
 * یعنی این تابع باید واقعاً در لایه‌ی سرویس صدا زده شود
 * (`apps/api/src/orders/order-status.service.ts`)، نه فقط مستند بماند.
 *
 * `Record<OrderStatus, ...>` تضمین می‌کند اگر enum مقدار جدیدی بگیرد و
 * اینجا نیاید، بیلد بشکند — همان الگوی exhaustive-map که در
 * T-003-DECISION برای enum-labels استفاده شد.
 */
export const ORDER_STATUS_TRANSITIONS: Record<
  OrderStatus,
  readonly OrderStatus[]
> = {
  PENDING: ["AWAITING_PAYMENT", "CANCELLED"],
  AWAITING_PAYMENT: ["PAYMENT_REVIEW", "CANCELLED"],
  /** PAYMENT_REVIEW → AWAITING_PAYMENT یعنی رسید رد شد، کاربر باید دوباره پرداخت کند. */
  PAYMENT_REVIEW: ["PAID", "AWAITING_PAYMENT", "CANCELLED"],
  PAID: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["READY_TO_SHIP", "CANCELLED"],
  READY_TO_SHIP: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  /** پایانی — مرجوعی از طریق موجودیت Return است، نه تغییر Order.status (§۸.۵۲). */
  DELIVERED: [],
  CANCELLED: [],
};

export function isValidOrderStatusTransition(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

/** برای تست/UI — همه‌ی وضعیت‌های پایانی (بدون هیچ گذار مجاز به بیرون). */
export const TERMINAL_ORDER_STATUSES: readonly OrderStatus[] =
  ORDER_STATUS_VALUES.filter(
    (status) => ORDER_STATUS_TRANSITIONS[status].length === 0,
  );
