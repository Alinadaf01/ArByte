import { useState } from "react";
import { downloadOrderDocument, type OrderDocumentKind } from "@/lib/api";
import { useToast } from "@/lib/ToastContext";
import type { AdminOrder } from "@/types/order";

export const DOCUMENT_LABELS: Record<OrderDocumentKind, string> = {
  invoice: "فاکتور",
  "packing-slip": "برگه بسته‌بندی",
  "shipping-label": "برچسب ارسال",
  "warranty-cards": "کارت‌های گارانتی",
};

/** F-01 §۳ — چهار سند سفارش؛ فقط بعد از پرداخت (paidAt، نه وضعیت فعلی —
 * سفارش پرداخت‌شده‌ی بعداً لغوشده هنوز فاکتور معتبر دارد). */
export function useOrderDocuments(
  order: Pick<AdminOrder, "id" | "orderNumber" | "paidAt">,
) {
  const toast = useToast();
  const [downloading, setDownloading] = useState<OrderDocumentKind | null>(
    null,
  );

  async function download(kind: OrderDocumentKind) {
    setDownloading(kind);
    try {
      await downloadOrderDocument(order.id, kind, order.orderNumber);
    } catch (error) {
      toast.showError(
        error instanceof Error ? error.message : "دانلود فایل ناموفق بود.",
      );
    } finally {
      setDownloading(null);
    }
  }

  return { canDownload: Boolean(order.paidAt), downloading, download };
}
