// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  trackAddToCart,
  trackBeginCheckout,
  trackPurchase,
  trackViewItem,
} from "./ecommerce";

function pushes(): Record<string, unknown>[] {
  return window.dataLayer as Record<string, unknown>[];
}

beforeEach(() => {
  window.dataLayer = [];
});

describe("ecommerce tracking — واحد پول و ساختار dataLayer", () => {
  it("مقدار تومان را ×۱۰ به ریال تبدیل می‌کند (همان قرارداد productJsonLd)", () => {
    trackViewItem({ id: "v1", name: "لپ‌تاپ", price: 1_000_000, quantity: 1 });
    const event = pushes().find((p) => p.event === "view_item");
    const ecommerce = event?.ecommerce as { value: number; currency: string };
    expect(ecommerce.value).toBe(10_000_000);
    expect(ecommerce.currency).toBe("IRR");
  });

  it("value جمع قیمت×تعداد است، نه فقط قیمت واحد", () => {
    trackAddToCart({ id: "v1", name: "لپ‌تاپ", price: 500_000, quantity: 3 });
    const event = pushes().find((p) => p.event === "add_to_cart");
    const ecommerce = event?.ecommerce as { value: number };
    expect(ecommerce.value).toBe(15_000_000);
  });

  it("قبل از هر رویداد، ecommerce قبلی را پاک می‌کند (بدون درز ایتم‌های رویداد قبل)", () => {
    trackAddToCart({ id: "v1", name: "الف", price: 1, quantity: 1 });
    const before = pushes().length;
    trackAddToCart({ id: "v2", name: "ب", price: 1, quantity: 1 });
    const after = pushes().slice(before);
    expect(after[0]).toEqual({ ecommerce: null });
    expect(after[1]?.event).toBe("add_to_cart");
  });

  it("begin_checkout از جمع سرور استفاده می‌کند، نه بازسازی از آیتم‌ها", () => {
    trackBeginCheckout(
      [{ id: "v1", name: "الف", price: 100_000, quantity: 2 }],
      250_000, // جمع سرور با تخفیف/ارسال، نه صرفاً ۲۰۰٬۰۰۰
    );
    const event = pushes().find((p) => p.event === "begin_checkout");
    const ecommerce = event?.ecommerce as { value: number };
    expect(ecommerce.value).toBe(2_500_000);
  });

  it("purchase شامل transaction_id پایدار است", () => {
    trackPurchase({
      transactionId: "ARB-12345",
      totalToman: 1_000_000,
      items: [{ id: "v1", name: "الف", price: 1_000_000, quantity: 1 }],
    });
    const event = pushes().find((p) => p.event === "purchase");
    const ecommerce = event?.ecommerce as { transaction_id: string };
    expect(ecommerce.transaction_id).toBe("ARB-12345");
  });

  it("begin_checkout با سبد خالی چیزی فایر نمی‌کند", () => {
    trackBeginCheckout([], 0);
    expect(pushes().some((p) => p.event === "begin_checkout")).toBe(false);
  });
});
