import { z } from "zod";

export const productFormSchema = z
  .object({
    sku: z.string().min(1, "کد کالا الزامی است."),
    slug: z
      .string()
      .min(1, "اسلاگ الزامی است.")
      .regex(
        /^[a-z0-9]+(-[a-z0-9]+)*$/,
        "اسلاگ فقط می‌تواند شامل حروف انگلیسی کوچک، عدد و خط تیره باشد.",
      ),
    name: z.string().min(1, "نام الزامی است."),
    shortDescription: z
      .string()
      .max(160, "توضیح کوتاه حداکثر ۱۶۰ کاراکتر می‌تواند باشد."),
    description: z.string(),
    price: z.coerce.number().int().min(0, "قیمت نمی‌تواند منفی باشد."),
    costPrice: z
      .number()
      .int()
      .min(0, "قیمت تمام‌شده نمی‌تواند منفی باشد.")
      .nullable(),
    category: z.number().nullable(),
    material: z.string(),
    dimensions: z.object({
      w: z.coerce.number().int().min(0),
      h: z.coerce.number().int().min(0),
      d: z.coerce.number().int().min(0),
    }),
    weight: z.coerce.number().int().min(0),
    order: z.coerce.number().int().min(0),
    isActive: z.boolean(),
    shippingTime: z.string(),
    warrantyTerms: z.string(),
    productionStatus: z.enum(["in_stock", "made_to_order", "discontinued"]),
    metaTitle: z.string(),
    metaDescription: z.string(),
  })
  .refine((data) => data.category !== null, {
    message: "دسته‌بندی الزامی است.",
    path: ["category"],
  });

export type ProductFormSchemaValues = z.infer<typeof productFormSchema>;

export const PRODUCTION_STATUS_LABELS: Record<
  ProductFormSchemaValues["productionStatus"],
  string
> = {
  in_stock: "آماده ارسال",
  made_to_order: "ساخت پس از سفارش",
  discontinued: "متوقف‌شده",
};
