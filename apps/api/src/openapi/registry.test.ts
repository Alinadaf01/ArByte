/**
 * معیار پذیرش T-004: «Swagger بدون خطا تولید می‌شود». این تست خودِ تولید
 * سند OpenAPI را (بدون بالا آوردن کل اپ NestJS) اجرا می‌کند تا خط‌لوله‌ی
 * Zod → OpenAPI روی شکل‌های واقعی قرارداد (union تفکیک‌شده در Availability،
 * schema بازگشتی CategoryTreeNode با z.lazy، تودرتوی عمیق admin/product)
 * واقعاً امتحان شود، نه فقط typecheck شود.
 */
import { describe, expect, it } from "vitest";
import { buildOpenApiDocument } from "./registry";

describe("buildOpenApiDocument", () => {
  it("بدون خطا یک سند OpenAPI 3.1 معتبر تولید می‌کند", () => {
    expect(() => buildOpenApiDocument()).not.toThrow();
  });

  it("مسیرهای هر دامنه را دارد", () => {
    const document = buildOpenApiDocument();
    expect(document.openapi).toBe("3.1.0");
    expect(document.info.title).toBe("ArByte API");

    const paths = Object.keys(document.paths ?? {});
    expect(paths).toEqual(
      expect.arrayContaining([
        "/api/v1/auth/otp/verify",
        "/api/v1/catalog/products/{slug}",
        "/api/v1/cart/items",
        "/api/v1/orders",
        "/api/v1/account/profile",
        "/api/v1/content/homepage",
        "/api/v1/admin/products",
        "/api/v1/admin/orders/{orderNumber}/status",
        "/api/v1/admin/users/{id}/impersonate",
      ]),
    );
  });

  it("طرح امنیتی bearerAuth ثبت شده است", () => {
    const document = buildOpenApiDocument();
    expect(document.components?.securitySchemes?.bearerAuth).toBeDefined();
  });
});
