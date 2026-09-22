import { describe, expect, it } from "vitest";
import { scrubPayload } from "./scrub-payload";

describe("scrubPayload — الحاقیه T-004 §۷", () => {
  it("شماره کارت کامل، CVV، توکن و هدر احراز هویت را حذف می‌کند", () => {
    const rawPayload = {
      transactionId: "TXN-12345",
      amount: 289_500_000,
      timestamp: "2026-09-22T10:00:00Z",
      statusCode: "00",
      cardNumber: "6274129012345678",
      cvv2: "741",
      token: "tok_live_abcdef123456",
      Authorization: "Bearer eyJhbGciOi...",
      card: {
        number: "6274129012345678",
        cvv: "741",
      },
    };

    const scrubbed = scrubPayload(rawPayload) as Record<string, unknown>;
    const scrubbedJson = JSON.stringify(scrubbed);

    expect(scrubbedJson).not.toContain("6274129012345678");
    expect(scrubbedJson).not.toContain("741"); // cvv value — منحصربه‌فرد، با هیچ فیلد مجازی تداخل ندارد
    expect(scrubbedJson).not.toContain("tok_live_abcdef123456");
    expect(scrubbedJson).not.toContain("Bearer");
    expect(scrubbedJson).not.toMatch(/cvv/i);
    expect(scrubbedJson).not.toMatch(/token/i);
    expect(scrubbedJson).not.toMatch(/authorization/i);
  });

  it("شناسه تراکنش، مبلغ، زمان، کد وضعیت را نگه می‌دارد", () => {
    const scrubbed = scrubPayload({
      transactionId: "TXN-12345",
      amount: 289_500_000,
      timestamp: "2026-09-22T10:00:00Z",
      statusCode: "00",
      cardNumber: "6274129012345678",
    }) as Record<string, unknown>;

    expect(scrubbed.transactionId).toBe("TXN-12345");
    expect(scrubbed.amount).toBe(289_500_000);
    expect(scrubbed.timestamp).toBe("2026-09-22T10:00:00Z");
    expect(scrubbed.statusCode).toBe("00");
  });

  it("چهار رقم آخر کارت را به‌جای شماره‌ی کامل نگه می‌دارد", () => {
    const scrubbed = scrubPayload({ cardNumber: "6274129012345678" }) as Record<
      string,
      unknown
    >;
    expect(scrubbed.cardLast4).toBe("5678");
    expect(scrubbed.cardNumber).toBeUndefined();
  });

  it("روی ساختار تودرتو هم بازگشتی کار می‌کند", () => {
    const scrubbed = scrubPayload({
      gateway: { card: { pan: "6274129012345678", cvc: "999" }, ref: "abc" },
    }) as Record<string, unknown>;
    const gateway = scrubbed.gateway as Record<string, unknown>;
    const card = gateway.card as Record<string, unknown>;
    expect(card.cardLast4).toBe("5678");
    expect(card.cvc).toBeUndefined();
    expect(gateway.ref).toBe("abc");
  });

  it("مقادیر غیر-object (رشته/عدد/null) را دست‌نخورده برمی‌گرداند", () => {
    expect(scrubPayload("plain string")).toBe("plain string");
    expect(scrubPayload(42)).toBe(42);
    expect(scrubPayload(null)).toBe(null);
  });
});
