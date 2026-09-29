import { z } from "zod";

export const stockAlertFormSchema = z.object({
  reorderPoint: z.coerce
    .number()
    .int()
    .min(0, "نقطه سفارش نمی‌تواند منفی باشد."),
  isActive: z.boolean(),
});

export type StockAlertFormValues = z.infer<typeof stockAlertFormSchema>;

export const createMovementFormSchema = z
  .object({
    productId: z.number().nullable(),
    type: z.enum(["purchase", "production", "adjustment", "scrap"]),
    quantity: z.coerce
      .number()
      .int()
      .positive("تعداد باید بزرگ‌تر از صفر باشد."),
    note: z.string(),
  })
  .refine((data) => data.productId !== null, {
    message: "محصول را انتخاب کنید.",
    path: ["productId"],
  });

export type CreateMovementFormSchemaValues = z.infer<
  typeof createMovementFormSchema
>;
