import { describe, expect, it } from "vitest";
import {
  TERMINAL_ORDER_STATUSES,
  isValidOrderStatusTransition,
} from "./status-transitions";

describe("isValidOrderStatusTransition", () => {
  it("گذارهای مجاز را قبول می‌کند", () => {
    expect(isValidOrderStatusTransition("PENDING", "AWAITING_PAYMENT")).toBe(
      true,
    );
    expect(isValidOrderStatusTransition("PAYMENT_REVIEW", "PAID")).toBe(true);
    expect(
      isValidOrderStatusTransition("PAYMENT_REVIEW", "AWAITING_PAYMENT"),
    ).toBe(true);
    expect(isValidOrderStatusTransition("READY_TO_SHIP", "SHIPPED")).toBe(true);
    expect(isValidOrderStatusTransition("SHIPPED", "DELIVERED")).toBe(true);
  });

  it("پرش نامعتبر PENDING → SHIPPED را رد می‌کند — معیار پذیرش صریح الحاقیه", () => {
    expect(isValidOrderStatusTransition("PENDING", "SHIPPED")).toBe(false);
  });

  it("از هر نقطه‌ی غیرپایانی می‌توان به CANCELLED رفت، جز READY_TO_SHIP/SHIPPED", () => {
    expect(isValidOrderStatusTransition("PENDING", "CANCELLED")).toBe(true);
    expect(isValidOrderStatusTransition("PROCESSING", "CANCELLED")).toBe(true);
    expect(isValidOrderStatusTransition("READY_TO_SHIP", "CANCELLED")).toBe(
      false,
    );
  });

  it("وضعیت‌های پایانی هیچ گذار مجازی ندارند", () => {
    for (const status of TERMINAL_ORDER_STATUSES) {
      expect(isValidOrderStatusTransition(status, "PROCESSING")).toBe(false);
    }
    expect(TERMINAL_ORDER_STATUSES).toEqual(
      expect.arrayContaining(["DELIVERED", "CANCELLED"]),
    );
  });

  it("گذار به همان وضعیت فعلی مجاز نیست (no-op نباید silently پاس شود)", () => {
    expect(isValidOrderStatusTransition("PROCESSING", "PROCESSING")).toBe(
      false,
    );
  });
});
