import type { Cart } from "@arbyte/contracts";

/**
 * D-04 §۴ — سبد سمت سرور است (apps/backend/apps/public_api). بدون ورود،
 * سرور یک کلید سشن مهمان در هدر X-Cart-Session برمی‌گرداند که باید روی
 * درخواست‌های بعدی برگردد — در localStorage نگه داشته می‌شود.
 *
 * E-02 §۱ — همه‌ی درخواست‌های سبد از `/api/proxy/cart*` رد می‌شوند، نه
 * مستقیم از مرورگر به Django. توکن کاربر واردشده در کوکی httpOnly است
 * (مرورگر خودش نمی‌تواند Authorization بسازد)؛ پراکسی همان کوکی را
 * می‌خواند و اگر کاربر وارد باشد Authorization را اضافه می‌کند، وگرنه
 * X-Cart-Session را دست‌نخورده رد می‌کند — یک مسیر، هم برای مهمان هم
 * برای کاربر واردشده.
 */
const PROXY_BASE = "/api/proxy";
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
    res = await fetch(`${PROXY_BASE}${path}`, { ...init, headers });
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

/** E-02 §۳ — نتیجه به‌جای `Cart | null` یک union است چون رد شدن کد باید
 * از خطای شبکه/غیرمنتظره جدا نشان داده شود (پیام طراحی متفاوت است). */
export type CouponResult =
  { ok: true; cart: Cart } | { ok: false; code: string; message: string };

export async function applyCoupon(code: string): Promise<CouponResult> {
  const sessionKey = getSessionKey();
  const headers = new Headers({ "Content-Type": "application/json" });
  if (sessionKey) headers.set("X-Cart-Session", sessionKey);

  let res: Response;
  try {
    res = await fetch(`${PROXY_BASE}/cart/coupon`, {
      method: "POST",
      headers,
      body: JSON.stringify({ code }),
    });
  } catch {
    return {
      ok: false,
      code: "NETWORK_ERROR",
      message: "خطا در ارتباط با سرور.",
    };
  }

  const returnedSessionKey = res.headers.get("X-Cart-Session");
  if (returnedSessionKey) setSessionKey(returnedSessionKey);

  const body = (await res.json()) as {
    data?: Cart;
    code?: string;
    message?: string;
  };
  if (!res.ok) {
    return {
      ok: false,
      code: body.code ?? "UNKNOWN",
      message: body.message ?? "کد تخفیف اعمال نشد.",
    };
  }
  return { ok: true, cart: body.data! };
}

export function removeCoupon(): Promise<Cart | null> {
  return cartFetch("/cart/coupon", { method: "DELETE" });
}

export function setShippingMethod(
  shippingMethodId: string,
): Promise<Cart | null> {
  return cartFetch("/cart/shipping-method", {
    method: "PATCH",
    body: JSON.stringify({ shippingMethodId }),
  });
}
