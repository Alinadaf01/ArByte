import { describe, expect, it } from "vitest";
import { ApiErrorSchema } from "../../src/common";
import { ProductListResponseSchema } from "../../src/catalog";
import {
  AboutResponseSchema,
  BlogCategoriesResponseSchema,
  BlogListResponseSchema,
  ContactResponseSchema,
  LegalResponseSchema,
  ProductReviewsResponseSchema,
  SiteInfoResponseSchema,
} from "../../src/content";
import { contractApiUrl, requestJson } from "./client";

/** G-01 — شکل سیم مسیرهای محتوا (وبلاگ، درباره ما، قوانین، تماس، نظرات). */
const baseUrl = contractApiUrl();
const describeIfServer = baseUrl ? describe : describe.skip;

describeIfServer("G-01 contract — content against live Zod schemas", () => {
  it("GET /blog → BlogListResponseSchema", async () => {
    const { status, body } = await requestJson(baseUrl!, "/blog?perPage=6");
    expect(status).toBe(200);
    expect(() => BlogListResponseSchema.parse(body)).not.toThrow();
  });

  it("GET /blog/categories → BlogCategoriesResponseSchema", async () => {
    const { status, body } = await requestJson(baseUrl!, "/blog/categories");
    expect(status).toBe(200);
    expect(() => BlogCategoriesResponseSchema.parse(body)).not.toThrow();
  });

  it("GET /blog/<ناموجود> → 404 NOT_FOUND", async () => {
    const { status, body } = await requestJson(
      baseUrl!,
      "/blog/no-such-post-g01",
    );
    expect(status).toBe(404);
    expect(ApiErrorSchema.parse(body).code).toBe("NOT_FOUND");
  });

  it("GET /content/about و /content/legal", async () => {
    const about = await requestJson(baseUrl!, "/content/about");
    expect(about.status).toBe(200);
    expect(() => AboutResponseSchema.parse(about.body)).not.toThrow();
    const legal = await requestJson(baseUrl!, "/content/legal");
    expect(legal.status).toBe(200);
    expect(() => LegalResponseSchema.parse(legal.body)).not.toThrow();
    const site = await requestJson(baseUrl!, "/content/site-info");
    expect(site.status).toBe(200);
    expect(() => SiteInfoResponseSchema.parse(site.body)).not.toThrow();
  });

  it("POST /contact — نامعتبر → 400 با fieldErrors، معتبر → 201", async () => {
    const bad = await requestJson(baseUrl!, "/contact", {
      method: "POST",
      body: { name: "", phone: "1", topic: "x", message: "" },
    });
    expect(bad.status).toBe(400);
    expect(ApiErrorSchema.parse(bad.body).code).toBe("VALIDATION_ERROR");
    const ok = await requestJson(baseUrl!, "/contact", {
      method: "POST",
      body: {
        name: "آزمون قرارداد",
        phone: "09120000000",
        topic: "پیش از خرید",
        message: "پیام آزمایشی تست قرارداد G-01",
      },
    });
    expect([201, 429]).toContain(ok.status);
    if (ok.status === 201)
      expect(() => ContactResponseSchema.parse(ok.body)).not.toThrow();
  });

  it("GET /catalog/products/:slug/reviews → ProductReviewsResponseSchema", async () => {
    const list = ProductListResponseSchema.parse(
      (await requestJson(baseUrl!, "/catalog/products?perPage=1")).body,
    );
    if (list.data.length === 0) return;
    const { status, body } = await requestJson(
      baseUrl!,
      `/catalog/products/${list.data[0]!.slug}/reviews`,
    );
    expect(status).toBe(200);
    expect(() => ProductReviewsResponseSchema.parse(body)).not.toThrow();
  });
});
