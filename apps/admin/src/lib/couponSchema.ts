import { z } from "zod";

export const couponFormSchema = z.object({
  code: z.string().min(1, "کد کوپن الزامی است."),
  type: z.enum(["percent", "fixed"]),
  value: z.coerce.number().int().min(1, "مقدار باید بزرگ‌تر از صفر باشد."),
  minOrderValue: z.coerce.number().int().min(0),
  maxDiscount: z.coerce.number().int().min(0).nullable(),
  usageLimit: z.coerce.number().int().min(1).nullable(),
  perUserLimit: z.coerce.number().int().min(1).nullable(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  categories: z.array(z.number()),
  products: z.array(z.number()),
  isActive: z.boolean(),
});

export type CouponFormSchemaValues = z.infer<typeof couponFormSchema>;
