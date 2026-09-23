import { z } from "zod";

/**
 * آینه‌ی enumهای Prisma (`apps/api/prisma/schema/`) — `packages/contracts`
 * نمی‌تواند مستقیم از Prisma وارد کند (apps/web و apps/admin پریزما ندارند)،
 * پس این enumها با همان مقادیر دقیق اینجا تکرار شده‌اند. اگر enum‌ای در
 * schema.prisma تغییر کرد، این فایل هم باید همگام شود — تست‌های سازگاری
 * (مثل الگوی enum-labels.test.ts در T-003-DECISION) این را چک می‌کنند.
 */

export const ORDER_STATUS_VALUES = [
  "PENDING",
  "AWAITING_PAYMENT",
  "PAYMENT_REVIEW",
  "PAID",
  "PROCESSING",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;
export const OrderStatusSchema = z.enum(ORDER_STATUS_VALUES);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const PAYMENT_STATUS_VALUES = [
  "UNPAID",
  "RECEIPT_UPLOADED",
  "UNDER_REVIEW",
  "CONFIRMED",
] as const;
export const PaymentStatusSchema = z.enum(PAYMENT_STATUS_VALUES);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const PAYMENT_METHOD_VALUES = [
  "MANUAL_CARD_TO_CARD",
  "GATEWAY",
] as const;
export const PaymentMethodSchema = z.enum(PAYMENT_METHOD_VALUES);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const PAYMENT_PROVIDER_VALUES = ["NONE", "BALEPAY"] as const;
export const PaymentProviderSchema = z.enum(PAYMENT_PROVIDER_VALUES);
export type PaymentProvider = z.infer<typeof PaymentProviderSchema>;

export const RECEIPT_STATUS_VALUES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const;
export const ReceiptStatusSchema = z.enum(RECEIPT_STATUS_VALUES);
export type ReceiptStatus = z.infer<typeof ReceiptStatusSchema>;

export const RETURN_STATUS_VALUES = [
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "RECEIVED",
  "REFUNDED",
] as const;
export const ReturnStatusSchema = z.enum(RETURN_STATUS_VALUES);
export type ReturnStatus = z.infer<typeof ReturnStatusSchema>;

export const PRODUCT_CONDITION_VALUES = [
  "NEW",
  "OPEN_BOX",
  "STOCK",
  "LIKE_NEW",
] as const;
export const ProductConditionSchema = z.enum(PRODUCT_CONDITION_VALUES);
/**
 * عمداً `ProductConditionValue` نه `ProductCondition` — این نام قبلاً در
 * messages/product.ts برای کلیدهای لایه‌ی نمایش (sealed/openBox/...) گرفته
 * شده؛ این یکی مقدار enum روی سیم است (NEW/OPEN_BOX/...)، مفهوم متفاوتی.
 */
export type ProductConditionValue = z.infer<typeof ProductConditionSchema>;

export const PRODUCT_STATUS_VALUES = ["ACTIVE", "INACTIVE"] as const;
export const ProductStatusSchema = z.enum(PRODUCT_STATUS_VALUES);
export type ProductStatus = z.infer<typeof ProductStatusSchema>;

/**
 * §۷.۳۸ — مشتق‌شده از quantity/threshold (T-003-DECISION)، نه یک ستون
 * دیتابیسی؛ اما روی سیم (پاسخ عمومی/ادمین) به‌عنوان یک مقدار enum است.
 */
export const STOCK_STATUS_VALUES = [
  "IN_STOCK",
  "LOW_STOCK",
  "OUT_OF_STOCK",
  "PREORDER",
] as const;
export const StockStatusSchema = z.enum(STOCK_STATUS_VALUES);
export type StockStatus = z.infer<typeof StockStatusSchema>;

export const PRICE_MODEL_VALUES = ["FIXED", "SUPPLIER_PLUS_PROFIT"] as const;
export const PriceModelSchema = z.enum(PRICE_MODEL_VALUES);
export type PriceModel = z.infer<typeof PriceModelSchema>;

export const PROFIT_TYPE_VALUES = ["AMOUNT", "PERCENT"] as const;
export const ProfitTypeSchema = z.enum(PROFIT_TYPE_VALUES);
export type ProfitType = z.infer<typeof ProfitTypeSchema>;

export const SPECIFICATION_TYPE_VALUES = [
  "TEXT",
  "NUMBER",
  "BOOLEAN",
  "SELECT",
  "MULTI_SELECT",
  "RANGE",
  "COLOR",
  "DATE",
] as const;
export const SpecificationTypeSchema = z.enum(SPECIFICATION_TYPE_VALUES);
export type SpecificationType = z.infer<typeof SpecificationTypeSchema>;

export const USER_STATUS_VALUES = ["ACTIVE", "BLOCKED"] as const;
export const UserStatusSchema = z.enum(USER_STATUS_VALUES);
export type UserStatus = z.infer<typeof UserStatusSchema>;

export const HOMEPAGE_BLOCK_TYPE_VALUES = [
  "HERO",
  "CATEGORY_GRID",
  /** T-210 §۴ — دوئل دو پرچم‌دار. */
  "FLAGSHIP_DUEL",
  "PRODUCT_RAIL",
  "CAMPAIGN",
  "BENEFITS",
  "BLOG_RAIL",
] as const;
export const HomepageBlockTypeSchema = z.enum(HOMEPAGE_BLOCK_TYPE_VALUES);
export type HomepageBlockType = z.infer<typeof HomepageBlockTypeSchema>;

export const COUPON_TYPE_VALUES = ["PERCENT", "AMOUNT"] as const;
export const CouponTypeSchema = z.enum(COUPON_TYPE_VALUES);
export type CouponType = z.infer<typeof CouponTypeSchema>;

/**
 * مرتب‌سازی فهرست محصول — T-004 بخش ۳: مقادیر مجاز محدود، هرگز رشته‌ی
 * آزاد (تزریق در ORDER BY).
 */
export const PRODUCT_SORT_VALUES = [
  "newest",
  "price_asc",
  "price_desc",
  "popular",
] as const;
export const ProductSortSchema = z.enum(PRODUCT_SORT_VALUES);
export type ProductSort = z.infer<typeof ProductSortSchema>;
