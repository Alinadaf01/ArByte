import { z } from "zod";

/** ارجاع سبک به برند/دسته‌بندی داخل پاسخ محصول — نه کل رکورد. */
export const BrandRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export const CategoryRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export const ProductImageSchema = z.object({
  url: z.string(),
  alt: z.string().nullable(),
  order: z.number().int().nonnegative(),
});

export const SeoSchema = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
  canonical: z.string().nullable(),
});
