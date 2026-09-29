import type { AddressSchema, Order, ShippingMethod } from "@arbyte/contracts";
import { PaymentMethodOptionSchema } from "@arbyte/contracts";
import { z } from "zod";

/**
 * E-02 §۴ — همه از `/api/proxy/*` رد می‌شوند (کوکی httpOnly، ر.ک.
 * cart-api.ts's توضیح بالای فایل). این‌ها همه نیازمند ورود واقعی‌اند
 * (آدرس/سفارش)، پس بدون کوکی معتبر همیشه ۴۰۱ می‌گیرند — صفحه‌ی چک‌اوت
 * خودش سمت سرور (Server Component) قبل از رندر این را چک می‌کند.
 */
const PROXY_BASE = "/api/proxy";
type Address = z.infer<typeof AddressSchema>;
type PaymentMethodOption = z.infer<typeof PaymentMethodOptionSchema>;

export async function fetchAddresses(): Promise<Address[]> {
  const res = await fetch(`${PROXY_BASE}/account/addresses`);
  if (!res.ok) return [];
  const body = (await res.json()) as { data: Address[] };
  return body.data;
}

export interface CreateAddressInput {
  recipientName: string;
  mobile: string;
  province: string;
  city: string;
  addressLine: string;
  postalCode?: string;
}

export async function createAddress(
  input: CreateAddressInput,
): Promise<Address | null> {
  const res = await fetch(`${PROXY_BASE}/account/addresses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { data: Address };
  return body.data;
}

export async function fetchShippingMethods(): Promise<ShippingMethod[]> {
  const res = await fetch(`${PROXY_BASE}/shipping-methods`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const body = (await res.json()) as { data: ShippingMethod[] };
  return body.data;
}

export async function fetchPaymentMethods(): Promise<PaymentMethodOption[]> {
  const res = await fetch(`${PROXY_BASE}/payment-methods`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const body = (await res.json()) as { data: PaymentMethodOption[] };
  return body.data;
}

export interface CreateOrderInput {
  addressId: string;
  paymentMethod: "MANUAL_CARD_TO_CARD" | "GATEWAY";
  invoiceType: "PERSONAL" | "CORPORATE";
  companyName?: string;
  nationalId?: string;
  economicCode?: string;
}

export type CreateOrderResult =
  | { ok: true; order: Order }
  | {
      ok: false;
      code: "PRICE_CHANGED" | "INSUFFICIENT_STOCK" | string;
      message: string;
      fieldErrors?: Record<string, string>;
    };

/** «ضد دوبار کلیک» (§۴): کلاینت یک UUID می‌سازد و در هدر Idempotency-Key
 * می‌فرستد؛ اگر همان کلید دوباره برسد (کلیک دوم، ری‌ترای شبکه)، سرور بدون
 * لمس دوباره‌ی سبد همان سفارش اول را برمی‌گرداند. */
export async function createOrder(
  input: CreateOrderInput,
  idempotencyKey: string,
): Promise<CreateOrderResult> {
  let res: Response;
  try {
    res = await fetch(`${PROXY_BASE}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(input),
    });
  } catch {
    return {
      ok: false,
      code: "NETWORK_ERROR",
      message: "خطا در ارتباط با سرور.",
    };
  }

  const body = (await res.json()) as {
    data?: Order;
    code?: string;
    message?: string;
    fieldErrors?: Record<string, string>;
  };
  if (!res.ok) {
    return {
      ok: false,
      code: body.code ?? "UNKNOWN",
      message: body.message ?? "ثبت سفارش ناموفق بود.",
      fieldErrors: body.fieldErrors,
    };
  }
  return { ok: true, order: body.data! };
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
