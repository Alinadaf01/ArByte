/**
 * `Record<Enum, string>` در enum-labels.ts خالی‌نبودن یک کلید را در زمان
 * کامپایل تضمین می‌کند؛ این تست چیز دیگری را چک می‌کند — که خودِ رشته‌ی
 * برچسب واقعاً محتوا دارد (نه یک "" خالی که کامپایلر قبولش می‌کند اما
 * کاربر یک ردیف خالی در رابط کاربری می‌بیند).
 */
import { describe, expect, it } from "vitest";
import {
  OrderStatus,
  PaymentStatus,
  ProductCondition,
  ReturnStatus,
} from "../../prisma/generated/prisma/client";
import {
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  PRODUCT_CONDITION_LABEL,
  RETURN_STATUS_LABEL,
  STOCK_STATUS_LABEL,
  STOCK_STATUS_VALUES,
} from "./enum-labels";

describe("enum label maps — هر مقدار enum یک برچسب غیرخالی دارد", () => {
  it.each(Object.values(OrderStatus))("OrderStatus.%s", (status) => {
    expect(ORDER_STATUS_LABEL[status].length).toBeGreaterThan(0);
  });

  it.each(Object.values(PaymentStatus))("PaymentStatus.%s", (status) => {
    expect(PAYMENT_STATUS_LABEL[status].length).toBeGreaterThan(0);
  });

  it.each(Object.values(ReturnStatus))("ReturnStatus.%s", (status) => {
    expect(RETURN_STATUS_LABEL[status].length).toBeGreaterThan(0);
  });

  it.each(Object.values(ProductCondition))("ProductCondition.%s", (value) => {
    expect(PRODUCT_CONDITION_LABEL[value].length).toBeGreaterThan(0);
  });

  it.each(STOCK_STATUS_VALUES)("StockStatus.%s", (value) => {
    expect(STOCK_STATUS_LABEL[value].length).toBeGreaterThan(0);
  });
});
