import { describe, expect, it, beforeAll } from "vitest";
import { OtpRequestResponseSchema } from "../../src/auth";
import { CartResponseSchema } from "../../src/cart";
import { ApiErrorSchema } from "../../src/common";
import { contractApiUrl, requestJson } from "./client";

/**
 * D-04 §۵ — «pnpm contract:test برای همه‌ی مسیرهای تازه». مثل D-03،
 * بدون CONTRACT_API_URL کامل skip می‌شود.
 *
 * سبد مهمان کاملاً عمومی است، پس مسیر شادِ کامل (create→patch→delete) را
 * این‌جا با درخواست واقعی تست می‌کنیم. auth/account اما نیازمند یک کد
 * OTP واقعی‌اند که فقط در لاگ سرور (OTP_DEV_MODE) چاپ می‌شود — از این
 * پروسه‌ی Node قابل خواندن نیست. رفتار کامل ورود/رفرش/impersonation/
 * merge (شامل مسیر موفق) از قبل در apps/backend/apps/public_api/
 * tests_d04_*.py با pytest پوشش داده شده؛ این فایل فقط شکل سیم
 * (Zod) را برای مسیرهای در دسترس بدون توکن — عمومی، یا رد شونده با ۴۰۱ —
 * تأیید می‌کند.
 */
const baseUrl = contractApiUrl();
const describeIfServer = baseUrl ? describe : describe.skip;

describeIfServer(
  "D-04 contract — auth/account/cart against live Zod schemas",
  () => {
    describe("auth — مسیرهای بدون نیاز به کد OTP واقعی", () => {
      it("POST /auth/otp/request — موبایل معتبر → ۲۰۰، OtpRequestResponseSchema", async () => {
        const mobile = `09${Math.floor(100000000 + Math.random() * 899999999)}`;
        const { status, body } = await requestJson(
          baseUrl!,
          "/auth/otp/request",
          {
            method: "POST",
            body: { mobile },
          },
        );
        expect(status).toBe(200);
        expect(() => OtpRequestResponseSchema.parse(body)).not.toThrow();
      });

      it("POST /auth/otp/request — موبایل نامعتبر → ۴۰۰، ApiErrorSchema", async () => {
        const { status, body } = await requestJson(
          baseUrl!,
          "/auth/otp/request",
          {
            method: "POST",
            body: { mobile: "123" },
          },
        );
        expect(status).toBe(400);
        const parsed = ApiErrorSchema.parse(body);
        expect(parsed.code).toBe("VALIDATION_ERROR");
      });

      it("POST /auth/otp/verify — کد غلط برای موبایلی بدون OTP فعال → خطای OTP_INVALID", async () => {
        const mobile = `09${Math.floor(100000000 + Math.random() * 899999999)}`;
        const { status, body } = await requestJson(
          baseUrl!,
          "/auth/otp/verify",
          {
            method: "POST",
            body: { mobile, code: "0000" },
          },
        );
        expect(status).toBe(400);
        const parsed = ApiErrorSchema.parse(body);
        expect(parsed.code).toBe("OTP_INVALID");
      });

      it("POST /auth/refresh — توکن نامعتبر → ۴۰۱، ApiErrorSchema", async () => {
        const { status, body } = await requestJson(baseUrl!, "/auth/refresh", {
          method: "POST",
          body: { refreshToken: "garbage-token" },
        });
        expect(status).toBe(401);
        expect(() => ApiErrorSchema.parse(body)).not.toThrow();
      });

      it("GET /auth/me — بدون Authorization → ۴۰۱، ApiErrorSchema", async () => {
        const { status, body } = await requestJson(baseUrl!, "/auth/me");
        expect(status).toBe(401);
        expect(() => ApiErrorSchema.parse(body)).not.toThrow();
      });

      it("POST /auth/impersonate/exchange — بلیت نامعتبر → خطا، ApiErrorSchema", async () => {
        const { status, body } = await requestJson(
          baseUrl!,
          "/auth/impersonate/exchange",
          { method: "POST", body: { ticket: "does-not-exist" } },
        );
        expect(status).toBeGreaterThanOrEqual(400);
        expect(() => ApiErrorSchema.parse(body)).not.toThrow();
      });
    });

    describe("account — همه نیازمند ورودند، پس بدون توکن باید ۴۰۱ بدهند", () => {
      it("GET /account/profile — بدون توکن → ۴۰۱", async () => {
        const { status, body } = await requestJson(
          baseUrl!,
          "/account/profile",
        );
        expect(status).toBe(401);
        expect(() => ApiErrorSchema.parse(body)).not.toThrow();
      });

      it("GET /account/addresses — بدون توکن → ۴۰۱", async () => {
        const { status, body } = await requestJson(
          baseUrl!,
          "/account/addresses",
        );
        expect(status).toBe(401);
        expect(() => ApiErrorSchema.parse(body)).not.toThrow();
      });

      it("GET /account/wishlist — بدون توکن → ۴۰۱", async () => {
        const { status, body } = await requestJson(
          baseUrl!,
          "/account/wishlist",
        );
        expect(status).toBe(401);
        expect(() => ApiErrorSchema.parse(body)).not.toThrow();
      });

      it("POST /account/wishlist/merge — بدون توکن → ۴۰۱", async () => {
        const { status, body } = await requestJson(
          baseUrl!,
          "/account/wishlist/merge",
          { method: "POST", body: [] },
        );
        expect(status).toBe(401);
        expect(() => ApiErrorSchema.parse(body)).not.toThrow();
      });
    });

    describe("cart — سبد مهمان کاملاً عمومی است؛ مسیر شاد کامل با X-Cart-Session", () => {
      let variantId = "";
      let sessionKey = "";

      beforeAll(async () => {
        const products = await requestJson(
          baseUrl!,
          "/catalog/products?perPage=1",
        );
        variantId = (
          products.body as { data: { defaultVariant: { id: string } }[] }
        ).data[0]!.defaultVariant.id;
      });

      it("GET /cart — بدون X-Cart-Session → ۲۰۰، سبد خالی، هدر سشن تازه برمی‌گردد", async () => {
        const { status, body, headers } = await requestJson(baseUrl!, "/cart");
        expect(status).toBe(200);
        const parsed = CartResponseSchema.parse(body);
        expect(parsed.data.items).toEqual([]);
        const returnedKey = headers.get("x-cart-session");
        expect(returnedKey).toBeTruthy();
        sessionKey = returnedKey!;
      });

      it("POST /cart/items — واریانت واقعی → ۲۰۱، CartResponseSchema، همان آیتم داخلش هست", async () => {
        const { status, body } = await requestJson(baseUrl!, "/cart/items", {
          method: "POST",
          headers: { "X-Cart-Session": sessionKey },
          body: { variantId, quantity: 2 },
        });
        expect(status).toBe(201);
        const parsed = CartResponseSchema.parse(body);
        expect(parsed.data.items).toHaveLength(1);
        expect(parsed.data.items[0]!.variant.id).toBe(variantId);
        expect(parsed.data.items[0]!.quantity).toBe(2);
      });

      it("POST /cart/items — quantity نامعتبر → ۴۰۰، ApiErrorSchema", async () => {
        // سشن جدا (بدون X-Cart-Session) — سبد اصلی از قبل همین واریانت را با
        // quantity=2 دارد؛ اگر همان سشن استفاده شود add_item جمع می‌زند
        // (2+0=2)، که معتبر است و ۲۰۱ برمی‌گرداند، نه ۴۰۰.
        const { status, body } = await requestJson(baseUrl!, "/cart/items", {
          method: "POST",
          body: { variantId, quantity: 0 },
        });
        expect(status).toBe(400);
        const parsed = ApiErrorSchema.parse(body);
        expect(parsed.code).toBe("VALIDATION_ERROR");
      });

      it("POST /cart/items — واریانت ناموجود → ۴۰۴، VARIANT_NOT_FOUND", async () => {
        const { status, body } = await requestJson(baseUrl!, "/cart/items", {
          method: "POST",
          headers: { "X-Cart-Session": sessionKey },
          body: { variantId: "does-not-exist-xyz", quantity: 1 },
        });
        expect(status).toBe(404);
        const parsed = ApiErrorSchema.parse(body);
        expect(parsed.code).toBe("VARIANT_NOT_FOUND");
      });

      it("PATCH /cart/items/:id — تعداد را عوض می‌کند، CartResponseSchema", async () => {
        const cart = await requestJson(baseUrl!, "/cart", {
          headers: { "X-Cart-Session": sessionKey },
        });
        const itemId = (cart.body as { data: { items: { id: string }[] } }).data
          .items[0]!.id;

        const { status, body } = await requestJson(
          baseUrl!,
          `/cart/items/${itemId}`,
          {
            method: "PATCH",
            headers: { "X-Cart-Session": sessionKey },
            body: { quantity: 3 },
          },
        );
        expect(status).toBe(200);
        const parsed = CartResponseSchema.parse(body);
        expect(parsed.data.items[0]!.quantity).toBe(3);
      });

      it("DELETE /cart/items/:id — آیتم را حذف می‌کند، سبد خالی می‌شود", async () => {
        const cart = await requestJson(baseUrl!, "/cart", {
          headers: { "X-Cart-Session": sessionKey },
        });
        const itemId = (cart.body as { data: { items: { id: string }[] } }).data
          .items[0]!.id;

        const { status, body } = await requestJson(
          baseUrl!,
          `/cart/items/${itemId}`,
          { method: "DELETE", headers: { "X-Cart-Session": sessionKey } },
        );
        expect(status).toBe(200);
        const parsed = CartResponseSchema.parse(body);
        expect(parsed.data.items).toEqual([]);
      });
    });
  },
);
