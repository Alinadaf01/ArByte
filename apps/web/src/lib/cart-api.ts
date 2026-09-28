import type { Cart } from "@arbyte/contracts";
import { env } from "./env";

/**
 * D-04 §۴ — سبد حالا سمت سرور است (apps/backend/apps/public_api). بدون
 * ورود، سرور یک کلید سشن مهمان در هدر X-Cart-Session برمی‌گرداند که باید
 * روی درخواست‌های بعدی برگردد؛ این‌جا در localStorage نگه داشته می‌شود
 * (docs/api/README.md: «سه store سمت کاربر»). ورود/کوکی هنوز در این بچ
 * نیست (D-04 §۶) — تا وقتی بچ ۰۳ ورود را ساخت، این فقط سبد مهمان را
 * می‌سازد؛ وقتی Authorization اضافه شد، سرور خودش آن را به سبد کاربر
 * ترجیح می‌دهد (apps/public_api/cart_service.py:resolve_cart).
 */
const API_BASE = env.NEXT_PUBLIC_API_BASE_URL;
export const CART_SESSION_STORAGE_KEY = "arbyte:cart-session:v1";

function getSessionKey(): string | null {
  try {
    return window.localStorage.getItem(CART_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setSessionKey(key: string) {
  try {
    window.localStorage.setItem(CART_SESSION_STORAGE_KEY, key);
  } catch {
    // quota/حالت خصوصی — سبد همچنان در همین تب کار می‌کند، فقط ماندگار نمی‌ماند.
  }
}

async function cartFetch(
  path: string,
  init?: RequestInit,
): Promise<Cart | null> {
  const sessionKey = getSessionKey();
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (sessionKey) headers.set("X-Cart-Session", sessionKey);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    return null;
  }

  const returnedSessionKey = res.headers.get("X-Cart-Session");
  if (returnedSessionKey) setSessionKey(returnedSessionKey);

  if (!res.ok) return null;
  const body = (await res.json()) as { data: Cart };
  return body.data;
}

export function fetchCart(): Promise<Cart | null> {
  return cartFetch("/cart");
}

export function addCartItem(
  variantId: string,
  quantity: number,
): Promise<Cart | null> {
  return cartFetch("/cart/items", {
    method: "POST",
    body: JSON.stringify({ variantId, quantity }),
  });
}

export function updateCartItemQuantity(
  itemId: string,
  quantity: number,
): Promise<Cart | null> {
  return cartFetch(`/cart/items/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
}

export function removeCartItem(itemId: string): Promise<Cart | null> {
  return cartFetch(`/cart/items/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
  });
}
