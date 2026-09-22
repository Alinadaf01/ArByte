import { z } from "zod";
import { successResponseSchema } from "../common/response";
import { SlugSchema } from "../validators";

/**
 * §۸.۱۹ — Entity مستقل برای برند. نه سند اصلی نه الحاقیه صریح یک اندپوینت
 * `/admin/brands` اسم نبرده‌اند (فهرست ادمین سند اصلی «محصولات» را عمومی
 * گفته)، اما seed (T-003) از قبل مجوزهای `brands.*` را ساخته و Product
 * بدون مدیریت برند قابل‌ساخت نیست — این فایل آن شکاف را پر می‌کند.
 */
export const AdminBrandSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logoUrl: z.string().nullable(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  deletedAt: z.string().datetime().nullable(),
});
export const AdminBrandListResponseSchema = successResponseSchema(
  z.array(AdminBrandSchema),
);

export const CreateBrandBodySchema = z.object({
  name: z.string().min(1).max(150),
  slug: SlugSchema.optional(),
  logoUrl: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});
export const UpdateBrandBodySchema = CreateBrandBodySchema.partial();
