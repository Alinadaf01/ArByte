/** D-03 §4 — thin fetch helper for the contract/parity test scripts. */

export interface RawResponse {
  status: number;
  body: unknown;
  headers: Headers;
}

export async function fetchJson(
  baseUrl: string,
  path: string,
): Promise<RawResponse> {
  const response = await fetch(`${baseUrl}${path}`);
  // G-02 — پاسخ 204 بدنه ندارد.
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { status: response.status, body, headers: response.headers };
}

/**
 * D-04 §۵ — مثل `fetchJson` ولی برای متد/بدنه/هدر دلخواه (POST/PATCH/
 * DELETE سبد و حساب کاربری، که `fetchJson` قبلی فقط GET می‌زد).
 */
export async function requestJson(
  baseUrl: string,
  path: string,
  init?: { method?: string; body?: unknown; headers?: Record<string, string> },
): Promise<RawResponse> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: init?.method ?? "GET",
    headers: { "Content-Type": "application/json", ...init?.headers },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  // G-02 — پاسخ 204 بدنه ندارد.
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { status: response.status, body, headers: response.headers };
}

export function contractApiUrl(): string | null {
  return process.env.CONTRACT_API_URL ?? null;
}
