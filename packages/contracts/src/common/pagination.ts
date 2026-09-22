import { z } from "zod";

/**
 * پارامترهای صفحه‌بندی مشترک بین همه‌ی فهرست‌ها — T-004 بخش ۱.
 * `z.coerce` چون این‌ها از query string می‌آیند (رشته)، نه JSON body.
 */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(24),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
