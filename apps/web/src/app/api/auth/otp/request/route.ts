import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  bffFetch,
  isOriginAllowed,
  upstreamHeaders,
  withUpstreamErrors,
} from "@/lib/server/bff-shared";

/** E-02 §۱ — قدم ۱، بدون توکن (کد فقط بعد از OtpVerify صادر می‌شود)؛ فقط forward خالص. */
async function handlePOST(request: NextRequest): Promise<Response> {
  if (!isOriginAllowed(request)) {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "درخواست نامعتبر است." },
      { status: 403 },
    );
  }

  const body = await request.text();
  const upstream = await bffFetch("/auth/otp/request", {
    method: "POST",
    headers: upstreamHeaders(request, { "content-type": "application/json" }),
    body,
  });

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { "content-type": "application/json" },
  });
}

export const POST = withUpstreamErrors(handlePOST);
