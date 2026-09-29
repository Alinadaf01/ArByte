import { describe, expect, it, beforeAll } from "vitest";
import {
  CategoryTreeResponseSchema,
  CategoryTopLevelResponseSchema,
  CategoryDetailResponseSchema,
  ProductListResponseSchema,
  ProductDetailResponseSchema,
  CatalogFiltersResponseSchema,
  SearchResponseSchema,
} from "../../src/catalog";
import { HomepageResponseSchema } from "../../src/content";
import { ApiErrorSchema } from "../../src/common";
import { contractApiUrl, fetchJson } from "./client";

/**
 * D-03 §4 — غیرقابل‌مذاکره: به CONTRACT_API_URL درخواست واقعی می‌زند و
 * پاسخ را با همان اسکیماهای Zod فرانت parse می‌کند. سرور باید از قبل seed
 * شده باشد (apps/backend: `pnpm be:migrate && node scripts/backend.mjs python manage.py
 * seed_arbyte`).
 *
 * بدون CONTRACT_API_URL، این فایل کامل skip می‌شود — طبق همان الگوی
 * «skip با دلیل» که بقیه‌ی پروژه برای پیش‌نیاز غایب استفاده می‌کند، نه
 * خطای قرمز روی هر `pnpm test` معمولی.
 */
const baseUrl = contractApiUrl();
const describeIfServer = baseUrl ? describe : describe.skip;

describeIfServer("D-03 contract — /api/v1 against live Zod schemas", () => {
  let firstCategorySlug = "";
  let firstProductSlug = "";

  beforeAll(async () => {
    const categories = await fetchJson(
      baseUrl!,
      "/catalog/categories/top-level",
    );
    firstCategorySlug = (categories.body as { data: { slug: string }[] })
      .data[0]!.slug;
    const products = await fetchJson(baseUrl!, "/catalog/products?perPage=1");
    firstProductSlug = (products.body as { data: { slug: string }[] }).data[0]!
      .slug;
  });

  it("GET /catalog/categories — CategoryTreeResponseSchema", async () => {
    const { status, body } = await fetchJson(baseUrl!, "/catalog/categories");
    expect(status).toBe(200);
    expect(() => CategoryTreeResponseSchema.parse(body)).not.toThrow();
  });

  it("GET /catalog/categories/top-level — CategoryTopLevelResponseSchema", async () => {
    const { status, body } = await fetchJson(
      baseUrl!,
      "/catalog/categories/top-level",
    );
    expect(status).toBe(200);
    expect(() => CategoryTopLevelResponseSchema.parse(body)).not.toThrow();
  });

  it("GET /catalog/categories/:slug — CategoryDetailResponseSchema", async () => {
    const { status, body } = await fetchJson(
      baseUrl!,
      `/catalog/categories/${firstCategorySlug}`,
    );
    expect(status).toBe(200);
    expect(() => CategoryDetailResponseSchema.parse(body)).not.toThrow();
  });

  it("GET /catalog/categories/:slug — اسلاگ نامعتبر → ۴۰۴ با پوسته‌ی خطا", async () => {
    const { status, body } = await fetchJson(
      baseUrl!,
      "/catalog/categories/does-not-exist-xyz",
    );
    expect(status).toBe(404);
    expect(() => ApiErrorSchema.parse(body)).not.toThrow();
  });

  it("GET /catalog/products — ProductListResponseSchema (پیش‌فرض)", async () => {
    const { status, body } = await fetchJson(baseUrl!, "/catalog/products");
    expect(status).toBe(200);
    expect(() => ProductListResponseSchema.parse(body)).not.toThrow();
  });

  it("GET /catalog/products — فیلتر دسته", async () => {
    const { status, body } = await fetchJson(
      baseUrl!,
      `/catalog/products?category=${firstCategorySlug}`,
    );
    expect(status).toBe(200);
    const parsed = ProductListResponseSchema.parse(body);
    for (const card of parsed.data) {
      expect(card.category.slug).toBe(firstCategorySlug);
    }
  });

  it("GET /catalog/products — sort=price_asc مرتب است", async () => {
    const { body } = await fetchJson(
      baseUrl!,
      "/catalog/products?sort=price_asc&perPage=60",
    );
    const parsed = ProductListResponseSchema.parse(body);
    const prices = parsed.data.map((c) => c.defaultVariant.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it("GET /catalog/products — صفحه ۲", async () => {
    const { status, body } = await fetchJson(
      baseUrl!,
      "/catalog/products?perPage=1&page=2",
    );
    expect(status).toBe(200);
    const parsed = ProductListResponseSchema.parse(body);
    expect(parsed.meta.pagination.page).toBe(2);
  });

  it("GET /catalog/products — perPage نامعتبر → ۴۰۰ با پوسته‌ی خطا", async () => {
    const { status, body } = await fetchJson(
      baseUrl!,
      "/catalog/products?perPage=999",
    );
    expect(status).toBe(400);
    const parsed = ApiErrorSchema.parse(body);
    expect(parsed.code).toBe("VALIDATION_ERROR");
    expect(parsed.fieldErrors).toBeDefined();
  });

  it("GET /catalog/products/:slug — ProductDetailResponseSchema", async () => {
    const { status, body } = await fetchJson(
      baseUrl!,
      `/catalog/products/${firstProductSlug}`,
    );
    expect(status).toBe(200);
    expect(() => ProductDetailResponseSchema.parse(body)).not.toThrow();
  });

  it("GET /catalog/products/:slug — اسلاگ نامعتبر → ۴۰۴", async () => {
    const { status, body } = await fetchJson(
      baseUrl!,
      "/catalog/products/does-not-exist-xyz",
    );
    expect(status).toBe(404);
    expect(() => ApiErrorSchema.parse(body)).not.toThrow();
  });

  it("GET /catalog/filters — CatalogFiltersResponseSchema", async () => {
    const { status, body } = await fetchJson(
      baseUrl!,
      `/catalog/filters?category=${firstCategorySlug}`,
    );
    expect(status).toBe(200);
    expect(() => CatalogFiltersResponseSchema.parse(body)).not.toThrow();
  });

  it("GET /catalog/search — SearchResponseSchema", async () => {
    const { status, body } = await fetchJson(baseUrl!, "/catalog/search?q=a");
    expect(status).toBe(200);
    expect(() => SearchResponseSchema.parse(body)).not.toThrow();
  });

  it("GET /catalog/search — بدون q → ۴۰۰", async () => {
    const { status, body } = await fetchJson(baseUrl!, "/catalog/search");
    expect(status).toBe(400);
    expect(() => ApiErrorSchema.parse(body)).not.toThrow();
  });

  it("GET /content/homepage — HomepageResponseSchema", async () => {
    const { status, body } = await fetchJson(baseUrl!, "/content/homepage");
    expect(status).toBe(200);
    expect(() => HomepageResponseSchema.parse(body)).not.toThrow();
  });
});
