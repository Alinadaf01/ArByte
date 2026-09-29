import { z } from "zod";

export const heroFormSchema = z.object({
  imageAlt: z.string().min(1, "متن جایگزین تصویر الزامی است."),
  title: z.string(),
  subtitle: z.string(),
  caption: z.string(),
  ctaLabel: z.string(),
  ctaUrl: z.string(),
  isActive: z.boolean(),
});

export type HeroFormSchema = z.infer<typeof heroFormSchema>;

export const showcaseSpecSchema = z.object({
  label: z.string().min(1, "عنوان مشخصه الزامی است."),
  value: z.string().min(1, "مقدار مشخصه الزامی است."),
});

export const showcaseFormSchema = z.object({
  order: z.union([z.literal(1), z.literal(2)]),
  product: z.string().nullable(),
  imageAlt: z.string(),
  title: z.string(),
  description: z.string(),
  specs: z.array(showcaseSpecSchema),
  ctaLabel: z.string(),
  ctaUrl: z.string(),
  theme: z.union([z.literal("light"), z.literal("dark")]),
  isActive: z.boolean(),
});

export type ShowcaseFormSchema = z.infer<typeof showcaseFormSchema>;
