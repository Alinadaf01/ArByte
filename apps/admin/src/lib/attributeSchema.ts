import { z } from "zod";

export const attributeFormSchema = z.object({
  name: z.string().min(1, "نام الزامی است."),
  slug: z
    .string()
    .min(1, "اسلاگ الزامی است.")
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "اسلاگ فقط می‌تواند شامل حروف انگلیسی کوچک، عدد و خط تیره باشد.",
    ),
  unit: z.string(),
  inputType: z.enum(["select", "text", "number", "boolean"]),
  categories: z.array(z.number()).min(1, "حداقل یک دسته‌بندی را انتخاب کنید."),
  isRequired: z.boolean(),
  order: z.coerce.number().int().min(0, "ترتیب نمی‌تواند منفی باشد."),
});

export type AttributeFormSchemaValues = z.infer<typeof attributeFormSchema>;

export const INPUT_TYPE_LABELS: Record<
  AttributeFormSchemaValues["inputType"],
  string
> = {
  select: "انتخابی",
  text: "متنی",
  number: "عددی",
  boolean: "بله/خیر",
};
