import { z } from "zod";
import { successResponseSchema } from "../common/response";

/** §۸.۷۶ — Key-Value ساختارمند. `value` عمداً `unknown` (هر تنظیمی شکل خودش را دارد). */
export const SettingSchema = z.object({
  key: z.string(),
  value: z.unknown(),
  category: z.string().nullable(),
  updatedAt: z.string().datetime(),
});
export const SettingListResponseSchema = successResponseSchema(
  z.array(SettingSchema),
);

export const UpdateSettingBodySchema = z.object({
  value: z.unknown(),
});

/**
 * کلیدهای شناخته‌شده‌ی این فاز (T-003 seed) — برای مستندسازی/اعتبارسنجی
 * فرانت، نه یک enum بسته (کلید تنظیمات باز و رو به رشد است).
 */
export const KNOWN_SETTING_KEYS = [
  "installments.enabled",
  "installments.maxCount",
  "installments.minAmount",
  "installments.provider",
  "inventory.lowStockThreshold",
] as const;
