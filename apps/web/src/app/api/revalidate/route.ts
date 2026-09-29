import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/**
 * F-02 — پنل ادمین (Django `apps/admin_api/revalidate.py`) بعد از ذخیره‌ی
 * محصول/صفحه اصلی این مسیر را صدا می‌زند تا صفحه‌های کش‌شده (ISR) همان
 * لحظه تازه شوند. فقط با `REVALIDATE_SECRET` مشترک؛ بدون آن ۴۰۱.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || request.headers.get("x-revalidate-secret") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    paths?: unknown;
  } | null;
  const paths = Array.isArray(body?.paths)
    ? body.paths.filter(
        (p): p is string => typeof p === "string" && p.startsWith("/"),
      )
    : [];
  for (const path of paths) revalidatePath(path);
  return NextResponse.json({ ok: true, revalidated: paths });
}
