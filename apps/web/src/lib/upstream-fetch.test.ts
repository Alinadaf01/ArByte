import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithTimeout, UpstreamTimeoutError } from "./upstream-fetch";

/** AUDIT-1 §12.9 — درخواست بالادستی معلق تا سقف Vercel نمی‌ماند. */
describe("fetchWithTimeout", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("aborts a hanging upstream with UpstreamTimeoutError", async () => {
    vi.stubGlobal(
      "fetch",
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    await expect(
      fetchWithTimeout("https://x/slow", {}, 20),
    ).rejects.toBeInstanceOf(UpstreamTimeoutError);
  });

  it("passes through a fast response and other network errors", async () => {
    vi.stubGlobal("fetch", async () => new Response("ok"));
    expect(await (await fetchWithTimeout("https://x", {}, 1000)).text()).toBe(
      "ok",
    );
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("fetch failed");
    });
    await expect(
      fetchWithTimeout("https://x", {}, 1000),
    ).rejects.toBeInstanceOf(TypeError);
  });
});
