import { z } from "zod";
import { paginatedResponseSchema } from "../common/response";
import { PaginationQuerySchema } from "../common/pagination";

/**
 * §۸.۷۷/۷۸ — فقط خواندنی. AuditLog در سطح دیتابیس هم Immutable است
 * (تریگر، T-003-DECISION) — این دامنه اصلاً اندپوینت نوشتن ندارد.
 */
export const AuditLogEntrySchema = z.object({
  id: z.string(),
  actorId: z.string().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  before: z.unknown().nullable(),
  after: z.unknown().nullable(),
  ipAddress: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const AuditLogListQuerySchema = PaginationQuerySchema.extend({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  actorId: z.string().optional(),
});
export const AuditLogListResponseSchema =
  paginatedResponseSchema(AuditLogEntrySchema);
