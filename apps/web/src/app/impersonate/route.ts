import {
  bffFetch,
  upstreamHeaders,
  withUpstreamErrors,
} from "@/lib/server/bff-shared";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { setImpersonationCookies } from "@/lib/server/auth-cookies";

/**
 * F-04 — لینک «ورود به حساب مشتری» پنل ادمین (بلیت ۶۰ ثانیه‌ای یک‌بارمصرف)
 * به اینجا می‌آید. بلیت سمت سرور با توکن access مبادله و در کوکی httpOnly
 * گذاشته می‌شود — توکن هرگز در URL یا مرورگر دیده نمی‌شود.
 */
async function handleGET(request: NextRequest): Promise<Response> {
  const ticket = request.nextUrl.searchParams.get("ticket");
  const home = new URL("/", request.url);
  if (!ticket) return NextResponse.redirect(home);

  const upstream = await bffFetch("/auth/impersonate/exchange", {
    method: "POST",
    headers: upstreamHeaders(request, { "content-type": "application/json" }),
    body: JSON.stringify({ ticket }),
  });
  const json = (await upstream.json().catch(() => null)) as {
    data?: { accessToken?: string };
  } | null;
  if (!upstream.ok || !json?.data?.accessToken) {
    return NextResponse.redirect(
      new URL("/login?impersonation=failed", request.url),
    );
  }
  await setImpersonationCookies(json.data.accessToken);
  return NextResponse.redirect(new URL("/account", request.url));
}

export const GET = withUpstreamErrors(handleGET);
