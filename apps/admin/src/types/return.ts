export type ReturnStatus =
  "requested" | "approved" | "received" | "refunded" | "rejected";

export interface AdminReturn {
  id: string;
  order: number;
  items: number[];
  status: ReturnStatus;
  reason: string;
  adminNote: string;
  createdAt: string;
  updatedAt: string;
}

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  requested: "درخواست‌شده",
  approved: "تأییدشده",
  received: "دریافت‌شده",
  refunded: "بازپرداخت‌شده",
  rejected: "ردشده",
};
