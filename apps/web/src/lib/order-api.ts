import type { Order } from "@arbyte/contracts";

/** E-05 §۱ — `GET /orders/:orderNumber` از پشت پراکسی (مالک واردشده). */
const PROXY_BASE = "/api/proxy";

export async function fetchOrder(orderNumber: string): Promise<Order | null> {
  const res = await fetch(
    `${PROXY_BASE}/orders/${encodeURIComponent(orderNumber)}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  const body = (await res.json()) as { data: Order };
  return body.data;
}

export interface UploadReceiptInput {
  orderNumber: string;
  file: File;
  amount: number;
}

/** رسید کارت‌به‌کارت — multipart، نه JSON. طراحی یک فیلد «شماره پیگیری
 * بانکی» هم داشت، ولی `POST /orders/:orderNumber/receipt` چنین فیلدی
 * ذخیره نمی‌کند (فقط file/amount) — طبق قاعده‌ی «بدون ادعای بی‌پشتوانه»
 * (همان الگوی Q-28) این فیلد اینجا ساخته نشد. */
export async function uploadReceipt(
  input: UploadReceiptInput,
): Promise<boolean> {
  const formData = new FormData();
  formData.set("file", input.file);
  formData.set("amount", String(input.amount));
  const res = await fetch(
    `${PROXY_BASE}/orders/${encodeURIComponent(input.orderNumber)}/receipt`,
    { method: "POST", body: formData },
  );
  return res.ok;
}

export async function initiateGatewayPayment(
  orderNumber: string,
): Promise<{ redirectUrl: string } | null> {
  const res = await fetch(
    `${PROXY_BASE}/orders/${encodeURIComponent(orderNumber)}/payment/initiate`,
    { method: "POST" },
  );
  if (!res.ok) return null;
  const body = (await res.json()) as { data: { redirectUrl: string } };
  return body.data;
}
