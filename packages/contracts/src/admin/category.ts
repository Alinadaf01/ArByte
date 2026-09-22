import { z } from "zod";
import { successResponseSchema } from "../common/response";
import { SlugSchema } from "../validators";
import { AdminSeoFieldsSchema, UpdateSeoFieldsBodySchema } from "./common";

export const AdminCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  parentId: z.string().nullable(),
  description: z.string().nullable(),
  imageMain: z.string().nullable(),
  imageBanner: z.string().nullable(),
  imageThumbnail: z.string().nullable(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  deletedAt: z.string().datetime().nullable(),
  /** §۸.۶۸ — تا وقتی سئو ست نشده null است (رابطه‌ی یک‌به‌یک اختیاری). */
  seo: AdminSeoFieldsSchema.nullable(),
});

export const AdminCategoryListResponseSchema = successResponseSchema(
  z.array(AdminCategorySchema),
);
export const AdminCategoryDetailResponseSchema =
  successResponseSchema(AdminCategorySchema);

export const CreateCategoryBodySchema = z.object({
  name: z.string().min(1).max(200),
  slug: SlugSchema.optional(),
  parentId: z.string().optional(),
  description: z.string().optional(),
  imageMain: z.string().optional(),
  imageBanner: z.string().optional(),
  imageThumbnail: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  seo: UpdateSeoFieldsBodySchema.optional(),
});
export const UpdateCategoryBodySchema = CreateCategoryBodySchema.partial();

export type CreateCategoryBody = z.infer<typeof CreateCategoryBodySchema>;
export type UpdateCategoryBody = z.infer<typeof UpdateCategoryBodySchema>;
export type AdminCategory = z.infer<typeof AdminCategorySchema>;
