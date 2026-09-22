import { z } from "zod";
import { successResponseSchema } from "../common/response";

/**
 * `POST /admin/users/:id/impersonate` — الحاقیه §۶، حساس‌ترین بخش T-004.
 * مجوز `users.impersonate` (پیش‌فرض فقط سوپرادمین). بلیت ۶۰ثانیه‌ای،
 * یک‌بارمصرف؛ تبادلش `POST /auth/impersonate/exchange` است (auth/index.ts).
 * هر دو مرحله باید در AuditLog با actorId=ادمین و entityId=مشتری ثبت شوند
 * — این مسئولیت پیاده‌سازی سرویس است، نه این فایل.
 */
export const IssueImpersonationTicketResponseSchema = successResponseSchema(
  z.object({
    ticket: z.string(),
    expiresAt: z.string().datetime(),
  }),
);
