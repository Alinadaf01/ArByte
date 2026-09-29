import { z } from "zod";

export const bulkPriceEditFormSchema = z
  .object({
    mode: z.enum(["percent", "fixed", "set"]),
    direction: z.enum(["increase", "decrease"]).optional(),
    value: z.coerce.number().int().min(0, "مقدار نمی‌تواند منفی باشد."),
    roundToNearest1000: z.boolean(),
    reason: z.string(),
  })
  .refine((data) => data.mode === "set" || !!data.direction, {
    message: "برای این حالت الزامی است.",
    path: ["direction"],
  });

export type BulkPriceEditFormValues = z.infer<typeof bulkPriceEditFormSchema>;

export const BULK_PRICE_EDIT_MODE_LABELS: Record<
  BulkPriceEditFormValues["mode"],
  string
> = {
  percent: "درصدی",
  fixed: "مبلغ ثابت",
  set: "قیمت مشخص",
};
