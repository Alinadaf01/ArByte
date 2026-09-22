/**
 * `packages/contracts` نمی‌تواند از Prisma وارد کند (apps/web/admin پریزما
 * ندارند)، پس enumهای T-004 (`common/enums.ts`) دستی تکرار شده‌اند. این
 * تست تنها جایی است که هر دو طرف (Prisma واقعی + آینه‌ی contracts) در یک
 * پروژه در دسترس‌اند — اگر یکی بدون دیگری عوض شود، اینجا شکست می‌خورد.
 */
import { describe, expect, it } from "vitest";
import {
  CouponType as PrismaCouponType,
  HomepageBlockType as PrismaHomepageBlockType,
  OrderStatus as PrismaOrderStatus,
  PaymentMethod as PrismaPaymentMethod,
  PaymentProvider as PrismaPaymentProvider,
  PaymentStatus as PrismaPaymentStatus,
  PriceModel as PrismaPriceModel,
  ProductCondition as PrismaProductCondition,
  ProductStatus as PrismaProductStatus,
  ProfitType as PrismaProfitType,
  ReceiptStatus as PrismaReceiptStatus,
  ReturnStatus as PrismaReturnStatus,
  SpecificationType as PrismaSpecificationType,
  UserStatus as PrismaUserStatus,
} from "../../prisma/generated/prisma/client";
import {
  COUPON_TYPE_VALUES,
  HOMEPAGE_BLOCK_TYPE_VALUES,
  ORDER_STATUS_VALUES,
  PAYMENT_METHOD_VALUES,
  PAYMENT_PROVIDER_VALUES,
  PAYMENT_STATUS_VALUES,
  PRICE_MODEL_VALUES,
  PRODUCT_CONDITION_VALUES,
  PRODUCT_STATUS_VALUES,
  PROFIT_TYPE_VALUES,
  RECEIPT_STATUS_VALUES,
  RETURN_STATUS_VALUES,
  SPECIFICATION_TYPE_VALUES,
  USER_STATUS_VALUES,
} from "@arbyte/contracts";

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

describe("contracts enum mirrors ↔ Prisma enums", () => {
  it.each([
    ["OrderStatus", PrismaOrderStatus, ORDER_STATUS_VALUES],
    ["PaymentStatus", PrismaPaymentStatus, PAYMENT_STATUS_VALUES],
    ["PaymentMethod", PrismaPaymentMethod, PAYMENT_METHOD_VALUES],
    ["PaymentProvider", PrismaPaymentProvider, PAYMENT_PROVIDER_VALUES],
    ["ReceiptStatus", PrismaReceiptStatus, RECEIPT_STATUS_VALUES],
    ["ReturnStatus", PrismaReturnStatus, RETURN_STATUS_VALUES],
    ["ProductCondition", PrismaProductCondition, PRODUCT_CONDITION_VALUES],
    ["ProductStatus", PrismaProductStatus, PRODUCT_STATUS_VALUES],
    ["PriceModel", PrismaPriceModel, PRICE_MODEL_VALUES],
    ["ProfitType", PrismaProfitType, PROFIT_TYPE_VALUES],
    ["SpecificationType", PrismaSpecificationType, SPECIFICATION_TYPE_VALUES],
    ["UserStatus", PrismaUserStatus, USER_STATUS_VALUES],
    ["HomepageBlockType", PrismaHomepageBlockType, HOMEPAGE_BLOCK_TYPE_VALUES],
    ["CouponType", PrismaCouponType, COUPON_TYPE_VALUES],
  ] as const)("%s matches exactly", (_name, prismaEnum, contractValues) => {
    expect(sorted(contractValues)).toEqual(sorted(Object.values(prismaEnum)));
  });
});
