import type { GuestOrder } from "@arbyte/contracts";

/** E-05 §۲ — `POST /orders/track` عمومی است (بدون ورود)، ولی همچنان از
 * پراکسی رد می‌شود — همان یک مسیر کلاینت برای همه‌ی درخواست‌ها (E-02 §۱،
 * Q-26)، حتی اگر این یکی به کوکی نیازی نداشته باشد. */
const PROXY_BASE = "/api/proxy";

export type TrackOrderResult = { ok: true; order: GuestOrder } | { ok: false };

export async function trackOrder(
  orderNumber: string,
  mobile: string,
): Promise<TrackOrderResult> {
  let res: Response;
  try {
    res = await fetch(`${PROXY_BASE}/orders/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber, mobile }),
    });
  } catch {
    return { ok: false };
  }
  if (!res.ok) return { ok: false };
  const body = (await res.json()) as { data: GuestOrder };
  return { ok: true, order: body.data };
}
