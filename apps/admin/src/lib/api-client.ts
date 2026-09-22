import type { ApiError } from "@arbyte/contracts";
import { env } from "./env";

export class ApiClientError extends Error {
  code: string;
  fieldErrors?: Record<string, string>;

  constructor(body: ApiError) {
    super(body.message);
    this.code = body.code;
    this.fieldErrors = body.fieldErrors;
  }
}

interface ApiSuccessEnvelope<T> {
  data: T;
  meta: { requestId: string };
}

/**
 * کلاینت ساده‌ی fetch سمت مرورگر برای صفحات ادمین (T-101، اولین مصرف واقعی
 * apps/api از apps/admin). پوشش موفق/خطا دقیقاً طبق بند ۸.۹۲/۸.۹۳
 * (`packages/contracts/src/common/response.ts` و `error-codes.ts`) باز
 * می‌شود — بدون نشست واقعی هنوز (ر.ک. PermissionGuard در apps/api).
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body = (await res.json()) as ApiSuccessEnvelope<T> | ApiError;

  if (!res.ok) {
    throw new ApiClientError(body as ApiError);
  }

  return (body as ApiSuccessEnvelope<T>).data;
}

export const apiGet = <T>(path: string) => apiFetch<T>(path);

export const apiPost = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) });

export const apiPatch = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) });

export const apiDelete = <T>(path: string) =>
  apiFetch<T>(path, { method: "DELETE" });
