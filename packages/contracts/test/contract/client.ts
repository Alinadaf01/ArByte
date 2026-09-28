/** D-03 §4 — thin fetch helper for the contract/parity test scripts. */

export interface RawResponse {
  status: number;
  body: unknown;
}

export async function fetchJson(
  baseUrl: string,
  path: string,
): Promise<RawResponse> {
  const response = await fetch(`${baseUrl}${path}`);
  const body = await response.json();
  return { status: response.status, body };
}

export function contractApiUrl(): string | null {
  return process.env.CONTRACT_API_URL ?? null;
}
