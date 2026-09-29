import { z } from "zod";

export const categoryFormSchema = z.object({
  slug: z
    .string()
    .min(1, "اسلاگ الزامی است.")
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "اسلاگ فقط می‌تواند شامل حروف انگلیسی کوچک، عدد و خط تیره باشد.",
    ),
  name: z.string().min(1, "نام الزامی است."),
  description: z.string(),
  parent: z.number().nullable(),
  order: z.coerce.number().int().min(0, "ترتیب نمی‌تواند منفی باشد."),
  isActive: z.boolean(),
});

export type CategoryFormSchemaValues = z.infer<typeof categoryFormSchema>;
