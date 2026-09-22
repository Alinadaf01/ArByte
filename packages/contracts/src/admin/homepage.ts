import { z } from "zod";
import { successResponseSchema } from "../common/response";
import { HomepageBlockTypeSchema } from "../common/enums";

/** مدیریت بلوک‌های صفحه‌ی اصلی — سند مقایسه‌ی وایب‌شاپ، الحاقیه T-004 §۸. */
export const AdminHomepageBlockSchema = z.object({
  id: z.string(),
  type: HomepageBlockTypeSchema,
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  title: z.string().nullable(),
  subtitle: z.string().nullable(),
  ctaLabel: z.string().nullable(),
  ctaUrl: z.string().nullable(),
  imageDesktop: z.string().nullable(),
  imageMobile: z.string().nullable(),
  /** §۱۰.۵۴ Image SEO — جدا گرفته شده، الزامی. */
  imageAlt: z.string().nullable(),
  config: z.unknown().nullable(),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
});
export const AdminHomepageBlockListResponseSchema = successResponseSchema(
  z.array(AdminHomepageBlockSchema),
);

export const CreateHomepageBlockBodySchema = z.object({
  type: HomepageBlockTypeSchema,
  isActive: z.boolean().default(true),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaUrl: z.string().optional(),
  imageDesktop: z.string().optional(),
  imageMobile: z.string().optional(),
  imageAlt: z.string().optional(),
  config: z.unknown().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});
export const UpdateHomepageBlockBodySchema =
  CreateHomepageBlockBodySchema.partial();

/** `PATCH /admin/homepage/blocks/reorder` — آرایه‌ی id به ترتیب نمایش جدید. */
export const ReorderHomepageBlocksBodySchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});
