/** F-04 — Return آربایت (orders.Return + ReturnItem با تصمیم قلم‌به‌قلم). */
export type ReturnStatus =
  "REQUESTED" | "APPROVED" | "REJECTED" | "RECEIVED" | "REFUNDED";
export type ReturnItemDecision = "PENDING" | "APPROVED" | "REJECTED";

export interface AdminReturnItem {
  id: number;
  orderItem: number;
  productName: string;
  variantName: string | null;
  sku: string;
  quantity: number;
  decision: ReturnItemDecision;
}

export interface AdminReturn {
  id: string;
  order: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  items: AdminReturnItem[];
  status: ReturnStatus;
  reason: string;
  description: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  REQUESTED: "درخواست ثبت شد",
  APPROVED: "تأیید شد",
  REJECTED: "رد شد",
  RECEIVED: "کالا دریافت شد",
  REFUNDED: "مبلغ بازگردانده شد",
};
