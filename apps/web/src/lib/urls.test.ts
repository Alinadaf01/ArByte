import { afterEach, describe, expect, it, vi } from "vitest";
import {
  absoluteUrl,
  apiOrigin,
  joinUrl,
  normalizeBaseUrl,
  serverApiBaseUrl,
  serverApiUrl,
} from "./urls";

/** AUDIT-1 §12.8 — تنها منبع آدرس‌های پایه. */
describe("normalizeBaseUrl", () => {
  it("drops trailing and duplicate slashes", () => {
    expect(normalizeBaseUrl("https://api.arbyte.ir/api/v1/")).toBe(
      "https://api.arbyte.ir/api/v1",
    );
    expect(normalizeBaseUrl(" https://api.arbyte.ir//api//v1// ")).toBe(
      "https://api.arbyte.ir/api/v1",
    );
    expect(normalizeBaseUrl("https://arbyte.ir/")).toBe("https://arbyte.ir");
  });

  it("rejects relative, non-http and query-carrying values", () => {
    expect(() => normalizeBaseUrl("api.arbyte.ir/api/v1")).toThrow();
    expect(() => normalizeBaseUrl("ftp://arbyte.ir")).toThrow();
    expect(() => normalizeBaseUrl("https://arbyte.ir/?x=1")).toThrow();
  });
});

describe("joinUrl", () => {
  it("never produces // or a missing slash", () => {
    expect(joinUrl("https://x/api/v1/", "/catalog")).toBe(
      "https://x/api/v1/catalog",
    );
    expect(joinUrl("https://x/api/v1", "catalog?q=a/b")).toBe(
      "https://x/api/v1/catalog?q=a/b",
    );
    expect(joinUrl("https://x/api/v1", "")).toBe("https://x/api/v1");
  });
});

describe("env resolution", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("prefers API_INTERNAL_URL and normalizes it", () => {
    vi.stubEnv("API_INTERNAL_URL", "http://django:8000/api/v1/");
    expect(serverApiBaseUrl()).toBe("http://django:8000/api/v1");
    expect(serverApiUrl("/seo/redirects")).toBe(
      "http://django:8000/api/v1/seo/redirects",
    );
    expect(apiOrigin()).toBe("http://django:8000");
  });

  it("falls back to localhost only outside production", () => {
    vi.stubEnv("API_INTERNAL_URL", "");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    vi.stubEnv("NODE_ENV", "test");
    expect(serverApiBaseUrl()).toBe("http://localhost:8000/api/v1");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => serverApiBaseUrl()).toThrow(/NEXT_PUBLIC_API_BASE_URL/);
  });

  it("guards Vercel production against a wrong API host", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("API_INTERNAL_URL", "https://staging.example.com/api/v1");
    expect(() => serverApiBaseUrl()).toThrow(/api\.arbyte\.ir/);
    vi.stubEnv("API_INTERNAL_URL", "https://api.arbyte.ir/api/v1/");
    expect(serverApiBaseUrl()).toBe("https://api.arbyte.ir/api/v1");
  });

  it("builds absolute storefront URLs from the normalized app URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://arbyte.ir/");
    expect(absoluteUrl("/products/x")).toBe("https://arbyte.ir/products/x");
  });
});
