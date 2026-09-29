import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { isOriginAllowed } from "@/lib/server/bff-shared";
import {
  clearAuthCookies,
  getAuthCookies,
  setAuthCookies,
} from "@/lib/server/auth-cookies";

/**
 * E-02 §۱ — پراکسی عمومی احرازهویت‌شده. مرورگر توکن را نمی‌بیند (کوکی
 * httpOnly)، پس هر درخواستی که یا نیاز به Authorization دارد یا می‌خواهد
 * X-Cart-Session را رفت‌وبرگشت کند از همین یک مسیر رد می‌شود — کلاینت
 * فقط `/api/proxy/<همان مسیر Django>` را صدا می‌زند، مهمان یا واردشده هر
 * دو، بدون این‌که خودش بداند کدام است. تصمیم معماری مستند در
 * docs/QUESTIONS.md (Q-26) چون سند تسک فقط otp/verify/refresh/logout را
 * صریح نام برده بود، نه یک الگوی کلی برای بقیه‌ی endpointهای احرازهویت‌شده.
 */

const WRITE_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);
const FORWARD_REQUEST_HEADERS = [
  "content-type",
  "x-cart-session",
  "idempotency-key",
];
const FORWARD_RESPONSE_HEADERS = ["content-type", "x-cart-session"];

async function forward(
  request: NextRequest,
  path: string[],
  accessToken: string | null,
): Promise<Response> {
  const url = `${env.NEXT_PUBLIC_API_BASE_URL}/${path.join("/")}${request.nextUrl.search}`;
  const headers = new Headers();
  for (const key of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  return fetch(url, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: "no-store",
  });
}

async function tryRefresh(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data: { accessToken: string; refreshToken: string };
    };
    await setAuthCookies(body.data.accessToken, body.data.refreshToken);
    return body.data.accessToken;
  } catch {
    return null;
  }
}

async function handle(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  if (WRITE_METHODS.has(request.method) && !isOriginAllowed(request)) {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "درخواست نامعتبر است." },
      { status: 403 },
    );
  }

  const { path } = await params;
  const { accessToken, refreshToken } = await getAuthCookies();

  let upstream = await forward(request, path, accessToken);

  if (upstream.status === 401 && refreshToken) {
    const newAccess = await tryRefresh(refreshToken);
    if (newAccess) {
      upstream = await forward(request, path, newAccess);
    } else {
      await clearAuthCookies();
    }
  }

  const responseHeaders = new Headers();
  for (const key of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(key);
    if (value) responseHeaders.set(key, value);
  }

  return new Response(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export {
  handle as GET,
  handle as POST,
  handle as PATCH,
  handle as PUT,
  handle as DELETE,
};
