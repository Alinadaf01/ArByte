import { z } from "zod";
import {
  successResponseSchema,
  paginatedResponseSchema,
} from "../common/response";
import { PaginationQuerySchema } from "../common/pagination";

/**
 * الحاقیه §۹ — برای لانچ یک انبار پیش‌فرض، بدون UI انتخابگر؛ اما
 * `warehouseName` همیشه در پاسخ می‌آید (طراحی «موجود در انبار تهران» را
 * نشان می‌دهد). اندپوینت مدیریت خودِ انبار در این فاز لازم نیست.
 */
export const AdminInventorySchema = z.object({
  variantId: z.string(),
  variantSku: z.string(),
  productName: z.string(),
  warehouseId: z.string(),
  warehouseName: z.string(),
  quantity: z.number().int().nonnegative(),
  reservedQuantity: z.number().int().nonnegative(),
  /** ستون محاسباتی دیتابیس (§۸.۳۱، T-003-DECISION) — همیشه خواندنی. */
  availableQuantity: z.number().int(),
  lowStockThreshold: z.number().int().positive().nullable(),
});

export const AdminInventoryListQuerySchema = PaginationQuerySchema.extend({
  lowStockOnly: z.coerce.boolean().optional(),
  q: z.string().optional(),
});
export const AdminInventoryListResponseSchema =
  paginatedResponseSchema(AdminInventorySchema);

/**
 * §۸.۳۴ کاردکس — موجودی هرگز مستقیم UPDATE نمی‌شود، هر اصلاح یک
 * InventoryTransaction می‌سازد. این بدنه‌ی درخواست، نه پاسخ.
 */
export const AdjustInventoryBodySchema = z.object({
  quantityChange: z.number().int(),
  type: z.enum(["STOCK_IN", "STOCK_OUT", "ADJUSTMENT"]),
  reference: z.string().optional(),
  note: z.string().optional(),
});

export const InventoryTransactionSchema = z.object({
  id: z.string(),
  type: z.enum([
    "STOCK_IN",
    "STOCK_OUT",
    "ADJUSTMENT",
    "RESERVATION",
    "RELEASE",
  ]),
  quantityChange: z.number().int(),
  quantityBefore: z.number().int(),
  quantityAfter: z.number().int(),
  reference: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export const InventoryTransactionListResponseSchema = successResponseSchema(
  z.array(InventoryTransactionSchema),
);
