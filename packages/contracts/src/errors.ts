import { z } from "zod";

/**
 * ساختار خطای استاندارد API — بند ۸.۹۳ برند بوک.
 * منبع حقیقت مشترک بین Backend (فیلتر استثنای سراسری) و Frontend (کلاینت API).
 */
export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  fieldErrors: z.record(z.string(), z.string()).optional(),
  requestId: z.string(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
