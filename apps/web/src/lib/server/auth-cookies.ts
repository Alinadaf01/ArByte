import { cookies } from "next/headers";

/**
 * E-02 §۱ — توکن‌ها هرگز در localStorage/JS نیستند؛ فقط کوکی httpOnly که
 * Route Handlerهای app/api/auth/* و app/api/proxy/* ست/خوانده می‌کنند.
 * طول عمر کوکی‌ها همان طول عمر توکن SimpleJWT است (D-04: access ۳۰ دقیقه،
 * refresh ۱۴ روز) — یک کوکی که دیرتر از خودِ توکن زنده بماند فقط باعث
 * درخواست بی‌فایده به Django می‌شود، نه ریسک امنیتی، اما بی‌دلیل است.
 */
export const ACCESS_COOKIE = "arbyte_access";
export const REFRESH_COOKIE = "arbyte_refresh";
/** F-04 — نشانگر غیرحساس (نه توکن) که نوار هشدار «در حال مشاهده به‌جای …»
 * سمت کلاینت از روی آن تصمیم می‌گیرد؛ layout ایستا می‌ماند. */
export const IMPERSONATION_COOKIE = "arbyte_imp";

const ACCESS_MAX_AGE = 30 * 60;
const REFRESH_MAX_AGE = 14 * 24 * 60 * 60;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    // dev روی http لوکال اجرا می‌شود — Secure=true آنجا کوکی را اصلاً ست
    // نمی‌گذارد (نه فقط توصیه، مرورگر واقعاً رد می‌کند).
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function setAuthCookies(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_COOKIE, accessToken, cookieOptions(ACCESS_MAX_AGE));
  store.set(REFRESH_COOKIE, refreshToken, cookieOptions(REFRESH_MAX_AGE));
}

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
  store.delete(IMPERSONATION_COOKIE);
}

/** F-04 — سشن Impersonation: فقط access (بدون refresh، پس با انقضا تمام
 * می‌شود) + نشانگر نوار هشدار. */
export async function setImpersonationCookies(
  accessToken: string,
): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_COOKIE, accessToken, cookieOptions(ACCESS_MAX_AGE));
  store.delete(REFRESH_COOKIE);
  store.set(IMPERSONATION_COOKIE, "1", {
    ...cookieOptions(ACCESS_MAX_AGE),
    httpOnly: false,
  });
}

export async function getAuthCookies(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
}> {
  const store = await cookies();
  return {
    accessToken: store.get(ACCESS_COOKIE)?.value ?? null,
    refreshToken: store.get(REFRESH_COOKIE)?.value ?? null,
  };
}

/** برای Server Componentها (SiteHeader/آیکون حساب، صفحه‌ی چک‌اوت) — فقط
 * حضور کوکی را چک می‌کند، نه اعتبار واقعی توکن. اعتبار واقعی همیشه سمت
 * Django چک می‌شود (هر درخواست از پراکسی رد می‌شود)؛ این فقط برای تصمیم
 * UI («دکمه‌ی ورود» در برابر «حساب من») است، نه یک مرز امنیتی. */
export async function hasAuthCookie(): Promise<boolean> {
  const { accessToken } = await getAuthCookies();
  return accessToken !== null;
}
