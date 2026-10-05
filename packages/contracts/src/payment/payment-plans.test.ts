import { describe, expect, it } from "vitest";
import { OrderPaymentBreakdownSchema } from "../order";
import { PaymentPlanListResponseSchema } from "./index";

/** AUDIT-3 — پاسخ واقعی سرور (صفرها معتبرند) باید parse شود. */
describe("payment plan contracts", () => {
  it("accepts unavailable plans with zero amounts", () => {
    const parsed = PaymentPlanListResponseSchema.safeParse({
      data: {
        total: 189_000_000,
        onlineLimit: 15_000_000,
        plans: [
          {
            plan: "ONLINE",
            available: false,
            reason: "سقف",
            onlineAmount: 0,
            bankAmount: 0,
          },
          {
            plan: "BANK_TRANSFER",
            available: true,
            reason: null,
            onlineAmount: 0,
            bankAmount: 189_000_000,
          },
          {
            plan: "COMBINED",
            available: true,
            reason: null,
            onlineAmount: 15_000_000,
            bankAmount: 174_000_000,
          },
        ],
      },
      meta: { requestId: "req_1" },
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts a breakdown before any payment", () => {
    expect(
      OrderPaymentBreakdownSchema.safeParse({
        plan: "COMBINED",
        total: 45_000_000,
        paid: 0,
        remaining: 45_000_000,
        onlinePaid: 0,
        bankPaid: 0,
      }).success,
    ).toBe(true);
  });
});
