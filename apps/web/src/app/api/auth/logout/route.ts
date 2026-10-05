import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { bffFetch, isOriginAllowed } from "@/lib/server/bff-shared";
import { clearAuthCookies, getAuthCookies } from "@/lib/server/auth-cookies";

/** E-02 §۱ — کوکی همیشه پاک می‌شود، حتی اگر تماس با Django (بلک‌لیست
 * توکن) شکست بخورد — خروج سمت کاربر نباید به سلامت شبکه گره بخورد. */
export async function POST(request: NextRequest): Promise<Response> {
  if (!isOriginAllowed(request)) {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "درخواست نامعتبر است." },
      { status: 403 },
    );
  }

  const { accessToken, refreshToken } = await getAuthCookies();
  if (accessToken) {
    try {
      await bffFetch("/auth/logout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // شبکه قطع بود — کوکی محلی همچنان پاک می‌شود، پایین.
    }
  }

  await clearAuthCookies();
  return NextResponse.json({ data: { ok: true } });
}
