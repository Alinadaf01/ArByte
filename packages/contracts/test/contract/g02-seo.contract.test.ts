import { describe, expect, it } from "vitest";
import {
  RedirectListResponseSchema,
  SitemapDataResponseSchema,
} from "../../src/content";
import { contractApiUrl, requestJson } from "./client";

/** G-02 — شکل سیم جدول ریدایرکت، داده‌ی sitemap و فید ترب. */
const baseUrl = contractApiUrl();
const describeIfServer = baseUrl ? describe : describe.skip;

describeIfServer("G-02 contract — seo against live Zod schemas", () => {
  it("GET /seo/redirects و /seo/sitemap", async () => {
    const redirects = await requestJson(baseUrl!, "/seo/redirects");
    expect(redirects.status).toBe(200);
    expect(() =>
      RedirectListResponseSchema.parse(redirects.body),
    ).not.toThrow();
    const sitemap = await requestJson(baseUrl!, "/seo/sitemap");
    expect(sitemap.status).toBe(200);
    expect(() => SitemapDataResponseSchema.parse(sitemap.body)).not.toThrow();
  });

  it("POST /analytics/pageview → 204؛ مسیر نامعتبر → 400", async () => {
    const ok = await requestJson(baseUrl!, "/analytics/pageview", {
      method: "POST",
      body: { path: "/contract-test" },
    });
    expect(ok.status).toBe(204);
    const bad = await requestJson(baseUrl!, "/analytics/pageview", {
      method: "POST",
      body: { path: "nope" },
    });
    expect(bad.status).toBe(400);
  });

  it("GET /feeds/torob — هر آیتم page_unique/قیمت/موجودی دارد", async () => {
    const origin = baseUrl!.replace(/\/api\/v1\/?$/, "");
    const res = await fetch(`${origin}/feeds/torob`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      products: {
        page_unique: string;
        current_price: number;
        availability: string;
      }[];
    };
    for (const p of body.products) {
      expect(p.page_unique).toBeTruthy();
      expect(["instock", "outofstock"]).toContain(p.availability);
      expect(
        p.availability === "instock"
          ? p.current_price > 0
          : p.current_price === 0,
      ).toBe(true);
    }
  });
});
