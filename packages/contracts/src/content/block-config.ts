import { z } from "zod";

/**
 * T-210 §۴.۲ — شکل ذخیره‌شده‌ی `HomepageBlock.config`، به‌ازای هر نوع بلوک.
 * قبلاً `config: z.unknown()` بود («شکل بی‌ساختار قابل قبول نیست»، سند تسک).
 * این اسکیما هم در seed و هم در بدنه‌ی `POST/PATCH /admin/homepage/blocks`
 * اعتبارسنجی می‌شود — نه فقط پاسخ حل‌شده‌ی `GET /content/homepage`
 * (که شکل دیگری دارد، ر.ک. `content/index.ts`).
 */
export const HomepageBlockConfigSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("HERO"),
    /** T-211 — مسیر مانیفست فریم‌های هیروی اسکرولی. */
    framesManifest: z.string(),
  }),
  z.object({
    type: z.literal("CATEGORY_GRID"),
    categorySlugs: z.array(z.string()).min(1),
  }),
  z.object({
    type: z.literal("FLAGSHIP_DUEL"),
    productSlugs: z.tuple([z.string(), z.string()]),
    /** [specificationDefinitionId توان کل, specificationDefinitionId روشنایی]. */
    metrics: z.tuple([z.string(), z.string()]),
  }),
  z.object({
    type: z.literal("PRODUCT_RAIL"),
    productSlugs: z.array(z.string()).min(1),
  }),
  z.object({
    type: z.literal("CAMPAIGN"),
  }),
  z.object({
    type: z.literal("BENEFITS"),
  }),
  z.object({
    type: z.literal("BLOG_RAIL"),
  }),
]);
export type HomepageBlockConfig = z.infer<typeof HomepageBlockConfigSchema>;
