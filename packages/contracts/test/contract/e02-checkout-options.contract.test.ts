import { describe, expect, it, beforeAll } from "vitest";
import { CartResponseSchema } from "../../src/cart";
import { ApiErrorSchema } from "../../src/common";
import { PaymentMethodListResponseSchema } from "../../src/payment";
import { ShippingMethodListResponseSchema } from "../../src/shipping";
import { contractApiUrl, requestJson } from "./client";

/**
 * E-02 §۷ — «pnpm contract:test برای همه‌ی مسیرهای جدید». مثل D-04/D-05،
 * بدون CONTRACT_API_URL کامل skip می‌شود.
 *
 * shipping-methods/payment-methods کاملاً عمومی‌اند — شکل سیم کامل اینجا
 * تست می‌شود. کوپن/روش‌ارسال روی سبد هم سبد مهمان است، پس مسیر شاد کامل
 * ممکن است. ثبت سفارش واقعی (idempotency/فاکتور) نیازمند ورود است — از
 * قبل با pytest در apps/backend/apps/public_api/tests_e02_checkout_options.py
 * پوشش داده شده؛ اینجا فقط مرز ۴۰۱ را تأیید می‌کند.
 */
const baseUrl = contractApiUrl();
const describeIfServer = baseUrl ? describe : describe.skip;

describeIfServer(
  "E-02 contract — checkout options against live Zod schemas",
  () => {
    describe("GET /shipping-methods — عمومی", () => {
      it("۲۰۰، ShippingMethodListResponseSchema", async () => {
        const { status, body } = await requestJson(
          baseUrl!,
          "/shipping-methods",
        );
        expect(status).toBe(200);
        expect(() =>
          ShippingMethodListResponseSchema.parse(body),
        ).not.toThrow();
      });
    });

    describe("GET /payment-methods — عمومی", () => {
      it("۲۰۰، PaymentMethodListResponseSchema", async () => {
        const { status, body } = await requestJson(
          baseUrl!,
          "/payment-methods",
        );
        expect(status).toBe(200);
        expect(() => PaymentMethodListResponseSchema.parse(body)).not.toThrow();
      });
    });

    describe("cart coupon/shipping-method — سبد مهمان، مسیر شاد کامل", () => {
      let sessionKey = "";

      beforeAll(async () => {
        const cart = await requestJson(baseUrl!, "/cart");
        sessionKey = cart.headers.get("x-cart-session")!;
      });

      it("POST /cart/coupon — بدون code → ۴۰۰، VALIDATION_ERROR", async () => {
        const { status, body } = await requestJson(baseUrl!, "/cart/coupon", {
          method: "POST",
          headers: { "X-Cart-Session": sessionKey },
          body: {},
        });
        expect(status).toBe(400);
        const parsed = ApiErrorSchema.parse(body);
        expect(parsed.code).toBe("VALIDATION_ERROR");
      });

      it("POST /cart/coupon — کد ناموجود → ۴۰۰، COUPON_INVALID", async () => {
        const { status, body } = await requestJson(baseUrl!, "/cart/coupon", {
          method: "POST",
          headers: { "X-Cart-Session": sessionKey },
          body: { code: "DOES-NOT-EXIST-XYZ" },
        });
        expect(status).toBe(400);
        const parsed = ApiErrorSchema.parse(body);
        expect(parsed.code).toBe("COUPON_INVALID");
      });

      it("DELETE /cart/coupon — بدون کوپن اعمال‌شده هم ۲۰۰، CartResponseSchema", async () => {
        const { status, body } = await requestJson(baseUrl!, "/cart/coupon", {
          method: "DELETE",
          headers: { "X-Cart-Session": sessionKey },
        });
        expect(status).toBe(200);
        const parsed = CartResponseSchema.parse(body);
        expect(parsed.data.coupon).toBeNull();
      });

      it("PATCH /cart/shipping-method — بدون shippingMethodId → ۴۰۰، VALIDATION_ERROR", async () => {
        const { status, body } = await requestJson(
          baseUrl!,
          "/cart/shipping-method",
          {
            method: "PATCH",
            headers: { "X-Cart-Session": sessionKey },
            body: {},
          },
        );
        expect(status).toBe(400);
        const parsed = ApiErrorSchema.parse(body);
        expect(parsed.code).toBe("VALIDATION_ERROR");
      });

      it("PATCH /cart/shipping-method — شناسه‌ی ناموجود → ۴۰۴، NOT_FOUND", async () => {
        const { status, body } = await requestJson(
          baseUrl!,
          "/cart/shipping-method",
          {
            method: "PATCH",
            headers: { "X-Cart-Session": sessionKey },
            body: { shippingMethodId: "does-not-exist-xyz" },
          },
        );
        expect(status).toBe(404);
        const parsed = ApiErrorSchema.parse(body);
        expect(parsed.code).toBe("NOT_FOUND");
      });

      it("GET /shipping-methods → یک روش واقعی، سپس روی سبد اعمالش می‌کنیم", async () => {
        const list = await requestJson(baseUrl!, "/shipping-methods");
        const methods = ShippingMethodListResponseSchema.parse(list.body).data;
        expect(methods.length).toBeGreaterThan(0);

        const { status, body } = await requestJson(
          baseUrl!,
          "/cart/shipping-method",
          {
            method: "PATCH",
            headers: { "X-Cart-Session": sessionKey },
            body: { shippingMethodId: methods[0]!.id },
          },
        );
        expect(status).toBe(200);
        const parsed = CartResponseSchema.parse(body);
        expect(parsed.data.shippingMethod?.id).toBe(methods[0]!.id);
      });
    });

    describe("order — ثبت سفارش نیازمند ورود است، بدون توکن باید ۴۰۱ بدهد", () => {
      it("POST /orders — با فیلد فاکتور و idempotency-key، بدون توکن → ۴۰۱", async () => {
        const { status, body } = await requestJson(baseUrl!, "/orders", {
          method: "POST",
          headers: { "Idempotency-Key": "contract-test-key" },
          body: {
            addressId: "1",
            paymentMethod: "GATEWAY",
            invoiceType: "CORPORATE",
            companyName: "شرکت آزمایشی",
            nationalId: "12345678901",
          },
        });
        expect(status).toBe(401);
        expect(() => ApiErrorSchema.parse(body)).not.toThrow();
      });
    });
  },
);
