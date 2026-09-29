import { ORDER_STATUS_DB_TO_KEY, orderStatusLabel } from "@arbyte/contracts";

/** F-01 §۳ — نه وضعیت آربایت، عیناً apps/orders/models.py (UPPER_SNAKE). */
export type OrderStatus = keyof typeof ORDER_STATUS_DB_TO_KEY;

export const ORDER_STATUSES = Object.keys(
  ORDER_STATUS_DB_TO_KEY,
) as OrderStatus[];

/** برچسب‌ها از packages/contracts (enum-labels مشترک با فروشگاه)، نه کپی محلی. */
export const statusLabel = (status: string) => orderStatusLabel(status);

export const STATUS_TONE: Record<
  OrderStatus,
  "brand" | "success" | "warning" | "danger" | "neutral"
> = {
  PENDING: "neutral",
  AWAITING_PAYMENT: "warning",
  PAYMENT_REVIEW: "warning",
  PAID: "brand",
  PROCESSING: "brand",
  READY_TO_SHIP: "brand",
  SHIPPED: "success",
  DELIVERED: "success",
  CANCELLED: "danger",
};

export interface OrderUnit {
  id: number;
  serialNumber: string | null;
  certificateId: string;
}

export interface OrderItem {
  id: number;
  variant: number | null;
  productName: string;
  variantName: string | null;
  sku: string;
  price: number;
  quantity: number;
  discount: number;
  subtotal: number;
  finalPrice: number;
  units: OrderUnit[];
}

export type ReceiptStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface OrderReceipt {
  id: number;
  amount: number;
  status: ReceiptStatus;
  uploadedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  fileUrl: string;
}

export interface OrderPayment {
  id: number;
  method: string;
  provider: string;
  gateway: string | null;
  amount: number;
  status: string;
  providerRef: string | null;
  createdAt: string;
  receipts: OrderReceipt[];
}

export interface OrderShipment {
  provider: string;
  cost: number;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
}

export interface OrderStatusLog {
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  user: number;
  userPhone: string | null;
  status: OrderStatus;
  paymentStatus: string;
  shippingRecipientName: string;
  shippingMobile: string;
  shippingProvince: string;
  shippingCity: string;
  shippingAddressLine: string;
  shippingPostalCode: string | null;
  shippingMethodName: string;
  invoiceType: "PERSONAL" | "CORPORATE";
  companyName: string | null;
  nationalId: string | null;
  economicCode: string | null;
  registrationNumber: string | null;
  subtotal: number;
  discountTotal: number;
  shippingCost: number;
  finalTotal: number;
  cancelReason: string | null;
  items: OrderItem[];
  payments: OrderPayment[];
  shipment: OrderShipment | null;
  statusHistory: OrderStatusLog[];
  allowedTransitions: OrderStatus[];
  missingSerialItemIds: number[];
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  GATEWAY: "درگاه پرداخت",
  MANUAL_CARD_TO_CARD: "کارت‌به‌کارت",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "در انتظار پرداخت",
  RECEIPT_UPLOADED: "رسید ارسال شده",
  UNDER_REVIEW: "در حال بررسی",
  CONFIRMED: "تأیید شده",
};

export const RECEIPT_STATUS_LABELS: Record<ReceiptStatus, string> = {
  PENDING: "در انتظار بررسی",
  APPROVED: "تأییدشده",
  REJECTED: "ردشده",
};
