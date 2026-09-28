import { describe, expect, it } from "vitest";
import { ApiErrorSchema } from "../../src/common";
import { contractApiUrl, requestJson } from "./client";

/**
 * D-05 §۷ — «pnpm contract:test برای همه‌ی مسیرهای جدید». مثل D-04، بدون
 * CONTRACT_API_URL کامل skip می‌شود.
 *
 * مسیر شاد کامل (ثبت سفارش واقعی، پرداخت، رسید، مرجوعی) نیازمند ورود
 * (کد OTP واقعی، فقط در لاگ سرور خوانده می‌شود — از این پروسه‌ی Node در
 * دسترس نیست) و از قبل در apps/backend/apps/public_api/tests_d05_orders.py
 * با pytest (۲۷ تست) پوشش داده شده. این فایل فقط شکل سیم (Zod) و مرزهای
 * دسترسی (۴۰۱ برای auth، پاسخ یکسان NOT_FOUND برای پیگیری مهمان) را روی
 * مسیرهای در دسترس بدون توکن تأیید می‌کند.
 */
const baseUrl = contractApiUrl();
const describeIfServer = baseUrl ? describe : describe.skip;

describeIfServer(
  "D-05 contract — orders/payments against live Zod schemas",
  () => {
    describe("order — همه نیازمند ورودند، پس بدون توکن باید ۴۰۱ بدهند", () => {
      it("POST /orders — بدون توکن → ۴۰۱", async () => {
        const { status, body } = await requestJson(baseUrl!, "/orders", {
          method: "POST",
          body: { addressId: "1", paymentMethod: "GATEWAY" },
        });
        expect(status).toBe(401);
        expect(() => ApiErrorSchema.parse(body)).not.toThrow();
      });

      it("GET /orders — بدون توکن → ۴۰۱", async () => {
        const { status, body } = await requestJson(baseUrl!, "/orders");
        expect(status).toBe(401);
        expect(() => ApiErrorSchema.parse(body)).not.toThrow();
      });

      it("GET /orders/:orderNumber — بدون توکن → ۴۰۱", async () => {
        const { status, body } = await requestJson(
          baseUrl!,
          "/orders/ARB-00000000",
        );
        expect(status).toBe(401);
        expect(() => ApiErrorSchema.parse(body)).not.toThrow();
      });

      it("POST /orders/:orderNumber/receipt — بدون توکن → ۴۰۱", async () => {
        const { status, body } = await requestJson(
          baseUrl!,
          "/orders/ARB-00000000/receipt",
          { method: "POST", body: { amount: 1000 } },
        );
        expect(status).toBe(401);
        expect(() => ApiErrorSchema.parse(body)).not.toThrow();
      });

      it("GET /orders/:orderNumber/invoice.pdf — بدون توکن → ۴۰۱", async () => {
        const { status, body } = await requestJson(
          baseUrl!,
          "/orders/ARB-00000000/invoice.pdf",
        );
        expect(status).toBe(401);
        expect(() => ApiErrorSchema.parse(body)).not.toThrow();
      });

      it("POST /orders/:orderNumber/return — بدون توکن → ۴۰۱", async () => {
        const { status, body } = await requestJson(
          baseUrl!,
          "/orders/ARB-00000000/return",
          { method: "POST", body: { reason: "test", items: [] } },
        );
        expect(status).toBe(401);
        expect(() => ApiErrorSchema.parse(body)).not.toThrow();
      });

      it("POST /orders/:orderNumber/payment/initiate — بدون توکن → ۴۰۱", async () => {
        const { status, body } = await requestJson(
          baseUrl!,
          "/orders/ARB-00000000/payment/initiate",
          { method: "POST" },
        );
        expect(status).toBe(401);
        expect(() => ApiErrorSchema.parse(body)).not.toThrow();
      });
    });

    describe("POST /orders/track — پیگیری مهمان، عمومی (D-05 §۵)", () => {
      it("بدون orderNumber/mobile → ۴۰۰، VALIDATION_ERROR", async () => {
        const { status, body } = await requestJson(baseUrl!, "/orders/track", {
          method: "POST",
          body: {},
        });
        expect(status).toBe(400);
        const parsed = ApiErrorSchema.parse(body);
        expect(parsed.code).toBe("VALIDATION_ERROR");
      });

      it("سفارش ناموجود → ۴۰۴، NOT_FOUND", async () => {
        const { status, body } = await requestJson(baseUrl!, "/orders/track", {
          method: "POST",
          body: { orderNumber: "ARB-99999999", mobile: "09120000000" },
        });
        expect(status).toBe(404);
        const parsed = ApiErrorSchema.parse(body);
        expect(parsed.code).toBe("NOT_FOUND");
      });

      it("موبایل نامعتبر برای همان سفارش ناموجود → همان ۴۰۴/NOT_FOUND (پاسخ یکسان، شماره‌ی سفارش حدس‌زدنی نیست)", async () => {
        const { status, body } = await requestJson(baseUrl!, "/orders/track", {
          method: "POST",
          body: { orderNumber: "ARB-99999999", mobile: "09121111111" },
        });
        expect(status).toBe(404);
        const parsed = ApiErrorSchema.parse(body);
        expect(parsed.code).toBe("NOT_FOUND");
      });
    });

    describe("payment — وب‌هوک/بازگشت درگاه، عمومی اما validation دارند (D-05 §۳)", () => {
      it("POST /payments/callback/:provider — بدون providerRef/amount → ۴۰۰، VALIDATION_ERROR", async () => {
        const { status, body } = await requestJson(
          baseUrl!,
          "/payments/callback/balepay",
          { method: "POST", body: {} },
        );
        expect(status).toBe(400);
        const parsed = ApiErrorSchema.parse(body);
        expect(parsed.code).toBe("VALIDATION_ERROR");
      });

      it("GET /payments/return/:provider — بدون providerRef → ۴۰۰، VALIDATION_ERROR", async () => {
        const { status, body } = await requestJson(
          baseUrl!,
          "/payments/return/balepay",
        );
        expect(status).toBe(400);
        const parsed = ApiErrorSchema.parse(body);
        expect(parsed.code).toBe("VALIDATION_ERROR");
      });

      it("GET /payments/return/:provider — تراکنش ناموجود → ۴۰۴، NOT_FOUND (هرگز پرداخت را تأیید نمی‌کند)", async () => {
        const { status, body } = await requestJson(
          baseUrl!,
          "/payments/return/balepay?providerRef=does-not-exist-xyz",
        );
        expect(status).toBe(404);
        const parsed = ApiErrorSchema.parse(body);
        expect(parsed.code).toBe("NOT_FOUND");
      });
    });
  },
);
