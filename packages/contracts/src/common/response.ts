import { z } from "zod";

/**
 * پوشش پاسخ استاندارد API — بند ۸.۹۲/۸.۹۳ برند بوک، T-004 بخش ۱.
 * هر پاسخ موفق (تکی یا فهرست) این شکل را دارد؛ `ApiErrorSchema` در
 * ../errors.ts برای پاسخ خطا است (پوشش جدا، نه یک union — کد HTTP خودش
 * موفق/ناموفق را مشخص می‌کند).
 */
export const ApiMetaSchema = z.object({
  requestId: z.string(),
});

export const PaginationMetaSchema = z.object({
  page: z.number().int().positive(),
  perPage: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export const PaginatedApiMetaSchema = ApiMetaSchema.extend({
  pagination: PaginationMetaSchema,
});

/** `{ data: T, meta: { requestId } }` — پاسخ تکی. */
export function successResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
    meta: ApiMetaSchema,
  });
}

/** `{ data: T[], meta: { requestId, pagination } }` — فهرست صفحه‌بندی‌شده. */
export function paginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    meta: PaginatedApiMetaSchema,
  });
}
