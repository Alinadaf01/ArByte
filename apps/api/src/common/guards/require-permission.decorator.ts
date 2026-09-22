import { SetMetadata } from "@nestjs/common";

export const PERMISSION_METADATA_KEY = "requiredPermission";

/**
 * کلید مجوز دقیقاً همان کلیدهای `packages/contracts/src/permissions-map.ts`
 * (بند ۸.۱۱ — `domain.action`) را می‌گیرد تا یک منبع حقیقت داشته باشیم.
 */
export const RequirePermission = (permission: string) =>
  SetMetadata(PERMISSION_METADATA_KEY, permission);
