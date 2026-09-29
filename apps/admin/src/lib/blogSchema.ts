import { z } from "zod";

export const blogSectionSchema = z.object({
  id: z.string(),
  heading: z.string().min(1, "عنوان بخش الزامی است."),
  body: z.string().min(1, "متن بخش الزامی است."),
});

export const blogPostFormSchema = z.object({
  slug: z
    .string()
    .min(1, "اسلاگ الزامی است.")
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "اسلاگ فقط می‌تواند شامل حروف انگلیسی کوچک، عدد و خط تیره باشد.",
    ),
  title: z.string().min(1, "عنوان الزامی است."),
  excerpt: z.string().min(1, "خلاصه الزامی است."),
  category: z.string().min(1, "دسته‌بندی الزامی است."),
  sections: z.array(blogSectionSchema),
  author: z.string().min(1, "نویسنده الزامی است."),
  authorRole: z.string(),
  tags: z.string(),
  readingTime: z.coerce
    .number()
    .int()
    .min(1, "زمان مطالعه باید حداقل ۱ دقیقه باشد."),
  coverAlt: z.string(),
  isPublished: z.boolean(),
  metaTitle: z.string(),
  metaDescription: z.string(),
});

export type BlogPostFormSchemaValues = z.infer<typeof blogPostFormSchema>;
