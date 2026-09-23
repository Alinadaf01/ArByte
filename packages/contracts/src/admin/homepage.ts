import { z } from "zod";
import { successResponseSchema } from "../common/response";
import { HomepageBlockTypeSchema } from "../common/enums";
import { HomepageBlockConfigSchema } from "../content/block-config";

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
  /** T-210 §۴.۲ — قبلاً `z.unknown()` بود («شکل بی‌ساختار قابل قبول نیست»). */
  config: HomepageBlockConfigSchema.nullable(),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
});
export const AdminHomepageBlockListResponseSchema = successResponseSchema(
  z.array(AdminHomepageBlockSchema),
);

export const CreateHomepageBlockBodySchema = z
  .object({
    type: HomepageBlockTypeSchema,
    isActive: z.boolean().default(true),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    ctaLabel: z.string().optional(),
    ctaUrl: z.string().optional(),
    imageDesktop: z.string().optional(),
    imageMobile: z.string().optional(),
    imageAlt: z.string().optional(),
    config: HomepageBlockConfigSchema.optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
  })
  .refine((body) => !body.config || body.config.type === body.type, {
    message: "config.type باید با type بلوک یکی باشد.",
    path: ["config"],
  });
export const UpdateHomepageBlockBodySchema = z.object({
  type: HomepageBlockTypeSchema.optional(),
  isActive: z.boolean().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaUrl: z.string().optional(),
  imageDesktop: z.string().optional(),
  imageMobile: z.string().optional(),
  imageAlt: z.string().optional(),
  config: HomepageBlockConfigSchema.optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

/** `PATCH /admin/homepage/blocks/reorder` — آرایه‌ی id به ترتیب نمایش جدید. */
export const ReorderHomepageBlocksBodySchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});
