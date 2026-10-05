import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  bffFetch,
  isOriginAllowed,
  upstreamHeaders,
  withUpstreamErrors,
} from "@/lib/server/bff-shared";
import { setAuthCookies } from "@/lib/server/auth-cookies";

interface VerifyBody {
  data?: {
    accessToken?: string;
    refreshToken?: string;
    user?: unknown;
  };
}

/** E-02 §۱ — تنها جایی که توکن واقعی از Django می‌رسد؛ فوراً در کوکی
 * httpOnly ذخیره می‌شود و هرگز در پاسخ به مرورگر برنمی‌گردد (فقط `user`). */
async function handlePOST(request: NextRequest): Promise<Response> {
  if (!isOriginAllowed(request)) {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "درخواست نامعتبر است." },
      { status: 403 },
    );
  }

  const body = await request.text();
  const upstream = await bffFetch("/auth/otp/verify", {
    method: "POST",
    headers: upstreamHeaders(request, { "content-type": "application/json" }),
    body,
  });

  const upstreamJson = (await upstream.json()) as VerifyBody;

  if (
    !upstream.ok ||
    !upstreamJson.data?.accessToken ||
    !upstreamJson.data.refreshToken
  ) {
    return NextResponse.json(upstreamJson, { status: upstream.status });
  }

  await setAuthCookies(
    upstreamJson.data.accessToken,
    upstreamJson.data.refreshToken,
  );

  return NextResponse.json({
    data: { user: upstreamJson.data.user },
    meta: { requestId: upstream.headers.get("x-request-id") ?? "unknown" },
  });
}

export const POST = withUpstreamErrors(handlePOST);
