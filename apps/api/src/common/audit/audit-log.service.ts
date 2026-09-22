import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "../../../prisma/generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

export interface RecordAuditLogParams {
  /** فعلاً همیشه `null` — هیچ نشست ادمین واقعی هنوز وصل نیست (ر.ک. PermissionGuard). */
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

/**
 * بند ۱۱.۲۷ — هر عملیات حساس یک ردیف در `AuditLog` می‌نویسد. جدول خودش
 * غیرقابل‌تغییر است (تریگر DB، T-003) — این سرویس فقط INSERT می‌کند.
 */
@Injectable()
export class AuditLogService {
  // Inject صریح — ر.ک. کامنت مشابه در category.controller.ts (esbuild/tsx).
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async record(params: RecordAuditLogParams): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        before: (params.before ?? undefined) as
          Prisma.InputJsonValue | undefined,
        after: (params.after ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
