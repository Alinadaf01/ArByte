import { z } from "zod";

/**
 * فیلدهای سئوی قابل‌ویرایش در ادمین — بند §۸.۶۸ (`SeoMetadata`، T-101).
 * برخلاف `catalog/common.ts`'s `SeoSchema` (که شکل نمایشی عمومی است:
 * `title`/`description`/`canonical`)، این نسخه نام ستون‌های واقعی دیتابیس
 * را عیناً منعکس می‌کند — چون فرم ادمین مستقیم همان ردیف را ویرایش می‌کند.
 */
export const AdminSeoFieldsSchema = z.object({
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
  canonical: z.string().nullable(),
});
export type AdminSeoFields = z.infer<typeof AdminSeoFieldsSchema>;

export const UpdateSeoFieldsBodySchema = z.object({
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  canonical: z.string().optional(),
});
