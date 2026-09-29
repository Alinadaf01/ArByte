import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { isOriginAllowed, upstreamHeaders } from "@/lib/server/bff-shared";

/** E-02 §۱ — قدم ۱، بدون توکن (کد فقط بعد از OtpVerify صادر می‌شود)؛ فقط forward خالص. */
export async function POST(request: NextRequest): Promise<Response> {
  if (!isOriginAllowed(request)) {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "درخواست نامعتبر است." },
      { status: 403 },
    );
  }

  const body = await request.text();
  const upstream = await fetch(
    `${env.NEXT_PUBLIC_API_BASE_URL}/auth/otp/request`,
    {
      method: "POST",
      headers: upstreamHeaders(request, { "content-type": "application/json" }),
      body,
      cache: "no-store",
    },
  );

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { "content-type": "application/json" },
  });
}
