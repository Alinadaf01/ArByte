import { z } from "zod";
import {
  successResponseSchema,
  paginatedResponseSchema,
} from "../common/response";
import { PaginationQuerySchema } from "../common/pagination";
import { OrderStatusSchema, PaymentStatusSchema } from "../common/enums";
import { MoneyAmountSchema } from "../validators";
import {
  OrderItemSchema,
  OrderPaymentSummarySchema,
  OrderShipmentSummarySchema,
  ShippingAddressSnapshotSchema,
} from "../order";

/** نمای ادمین سفارش — همان فیلدهای مشتری + شناسه‌ی مشتری برای رجوع. */
export const AdminOrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  userId: z.string(),
  status: OrderStatusSchema,
  paymentStatus: PaymentStatusSchema,
  items: z.array(OrderItemSchema),
  shippingAddress: ShippingAddressSnapshotSchema,
  subtotal: MoneyAmountSchema,
  discountTotal: MoneyAmountSchema,
  shippingCost: MoneyAmountSchema,
  finalTotal: MoneyAmountSchema,
  cancelReason: z.string().nullable(),
  payment: OrderPaymentSummarySchema.nullable(),
  shipment: OrderShipmentSummarySchema,
  createdAt: z.string().datetime(),
});

export const AdminOrderListQuerySchema = PaginationQuerySchema.extend({
  status: OrderStatusSchema.optional(),
  paymentStatus: PaymentStatusSchema.optional(),
  q: z.string().optional(),
});
export const AdminOrderListResponseSchema =
  paginatedResponseSchema(AdminOrderSchema);
export const AdminOrderDetailResponseSchema =
  successResponseSchema(AdminOrderSchema);

export const OrderStatusHistoryEntrySchema = z.object({
  id: z.string(),
  fromStatus: OrderStatusSchema.nullable(),
  toStatus: OrderStatusSchema,
  changedByUserId: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export const OrderStatusHistoryResponseSchema = successResponseSchema(
  z.array(OrderStatusHistoryEntrySchema),
);

/**
 * `PATCH /admin/orders/:orderNumber/status` — تنها راه مجاز تغییر وضعیت
 * (الحاقیه §۵). سرویس `OrderStatusService.transitionTo` (apps/api) این
 * را در برابر جدول گذارها چک می‌کند؛ رد شدن یعنی خطای INVALID_STATUS_TRANSITION.
 */
export const UpdateOrderStatusBodySchema = z.object({
  status: OrderStatusSchema,
  reason: z.string().optional(),
});
