import { z } from "zod";
import { successResponseSchema } from "../common/response";
import { SlugSchema } from "../validators";
import { AdminSeoFieldsSchema, UpdateSeoFieldsBodySchema } from "./common";

/**
 * §۸.۱۹ — Entity مستقل برای برند. نه سند اصلی نه الحاقیه صریح یک اندپوینت
 * `/admin/brands` اسم نبرده‌اند (فهرست ادمین سند اصلی «محصولات» را عمومی
 * گفته)، اما seed (T-003) از قبل مجوزهای `brands.*` را ساخته و Product
 * بدون مدیریت برند قابل‌ساخت نیست — این فایل آن شکاف را پر می‌کند.
 * `seo` در T-101 اضافه شد — سند فاز ۱ صریحاً «فیلدهای سئو» برای برند خواسته
 * بود؛ `SeoMetadata.brandId` هم در همان تسک اضافه شد (پیش از آن مدل داده
 * اصلاً راهی برای سئوی برند نداشت).
 */
export const AdminBrandSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logoUrl: z.string().nullable(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  deletedAt: z.string().datetime().nullable(),
  seo: AdminSeoFieldsSchema.nullable(),
});
export const AdminBrandListResponseSchema = successResponseSchema(
  z.array(AdminBrandSchema),
);
export const AdminBrandDetailResponseSchema =
  successResponseSchema(AdminBrandSchema);

export const CreateBrandBodySchema = z.object({
  name: z.string().min(1).max(150),
  slug: SlugSchema.optional(),
  logoUrl: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  seo: UpdateSeoFieldsBodySchema.optional(),
});
export const UpdateBrandBodySchema = CreateBrandBodySchema.partial();

export type CreateBrandBody = z.infer<typeof CreateBrandBodySchema>;
export type UpdateBrandBody = z.infer<typeof UpdateBrandBodySchema>;
export type AdminBrand = z.infer<typeof AdminBrandSchema>;
