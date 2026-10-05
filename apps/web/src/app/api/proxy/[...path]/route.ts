import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  bffFetch,
  isOriginAllowed,
  upstreamHeaders,
  withUpstreamErrors,
} from "@/lib/server/bff-shared";
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
const FORWARD_RESPONSE_HEADERS = [
  "content-type",
  "x-cart-session",
  // E-05 §۱ — فاکتور/کارت گارانتی PDF نامِ فایل پیشنهادی سرور را نگه
  // می‌دارند (Django's pdf_filename())، به‌جای این‌که کلاینت خودش بسازد.
  "content-disposition",
];

async function forward(
  request: NextRequest,
  path: string[],
  accessToken: string | null,
): Promise<Response> {
  const headers = upstreamHeaders(request);
  for (const key of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  return bffFetch(`/${path.join("/")}${request.nextUrl.search}`, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
  });
}

async function tryRefresh(refreshToken: string): Promise<string | null> {
  try {
    const res = await bffFetch("/auth/refresh", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
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

  // G-02 — 204/205/304 بدنه ندارند؛ `new Response(body, {status: 204})`
  // خطا می‌دهد و هر پاسخ 204 (حذف آدرس/علاقه‌مندی، ثبت بازدید) 500 می‌شد.
  const nullBody = [204, 205, 304].includes(upstream.status);
  return new Response(nullBody ? null : await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: responseHeaders,
  });
}

const guarded = withUpstreamErrors(handle);
export {
  guarded as GET,
  guarded as POST,
  guarded as PATCH,
  guarded as PUT,
  guarded as DELETE,
};
