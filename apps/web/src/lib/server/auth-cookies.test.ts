import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * E-02 §۱/§۵ — واحد: ست/پاک کوکی httpOnly. `next/headers`'s `cookies()`
 * فقط داخل یک درخواست واقعی Next.js کار می‌کند؛ اینجا با یک Map ساده mock
 * می‌شود که رفتار `.set/.get/.delete` را تقلید می‌کند.
 */
const store = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: () => ({
    set: (name: string, value: string) => store.set(name, value),
    get: (name: string) =>
      store.has(name) ? { value: store.get(name)! } : undefined,
    delete: (name: string) => store.delete(name),
  }),
}));

beforeEach(() => {
  store.clear();
});

describe("auth-cookies", () => {
  it("setAuthCookies هر دو توکن را ذخیره می‌کند", async () => {
    const { setAuthCookies, getAuthCookies } = await import("./auth-cookies");
    await setAuthCookies("access-1", "refresh-1");
    expect(await getAuthCookies()).toEqual({
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
  });

  it("clearAuthCookies هر دو را پاک می‌کند", async () => {
    const { setAuthCookies, clearAuthCookies, getAuthCookies } =
      await import("./auth-cookies");
    await setAuthCookies("access-1", "refresh-1");
    await clearAuthCookies();
    expect(await getAuthCookies()).toEqual({
      accessToken: null,
      refreshToken: null,
    });
  });

  it("hasAuthCookie قبل از ورود false، بعد از ست‌شدن access true است", async () => {
    const { setAuthCookies, hasAuthCookie } = await import("./auth-cookies");
    expect(await hasAuthCookie()).toBe(false);
    await setAuthCookies("access-1", "refresh-1");
    expect(await hasAuthCookie()).toBe(true);
  });
});
