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

/** E-02 §۱ — تمدید دستی (کلاینت وقتی پراکسی ۴۰۱ می‌دهد این را صدا می‌زند)؛
 * app/api/proxy هم به‌صورت خودکار همین مسیر را داخلی صدا می‌زند. */
async function handlePOST(request: NextRequest): Promise<Response> {
  if (!isOriginAllowed(request)) {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "درخواست نامعتبر است." },
      { status: 403 },
    );
  }

  const { refreshToken } = await getAuthCookies();
  if (!refreshToken) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "نشست منقضی شده است." },
      { status: 401 },
    );
  }

  const upstream = await bffFetch("/auth/refresh", {
    method: "POST",
    headers: upstreamHeaders(request, { "content-type": "application/json" }),
    body: JSON.stringify({ refreshToken }),
  });

  if (!upstream.ok) {
    await clearAuthCookies();
    const upstreamJson = await upstream.json();
    return NextResponse.json(upstreamJson, { status: upstream.status });
  }

  const upstreamJson = (await upstream.json()) as {
    data: { accessToken: string; refreshToken: string };
  };
  await setAuthCookies(
    upstreamJson.data.accessToken,
    upstreamJson.data.refreshToken,
  );
  return NextResponse.json({ data: { ok: true } });
}

export const POST = withUpstreamErrors(handlePOST);
