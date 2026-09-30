import { z } from "zod";

/**
 * بند ۱۲.۱۳ و ۱۱.۱۰۸ برند بوک: هر متغیر محیطی باید مستند و در بوت اعتبارسنجی شود.
 * اگر یکی از متغیرهای ضروری غایب باشد، اپ باید در بوت با پیام واضح fail کند —
 * نه اینکه بی‌صدا با مقدار پیش‌فرض حساس کار کند.
 */
const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

if (!parsed.success) {
  throw new Error(
    `پیکربندی محیطی apps/web ناقص است. apps/web/.env.example را ببین.\n${parsed.error.toString()}`,
  );
}

export const env = parsed.data;

if (process.env.VERCEL_ENV === "production") {
  if (env.NEXT_PUBLIC_APP_URL !== "https://arbyte.ir") {
    throw new Error(
      "Production NEXT_PUBLIC_APP_URL must be https://arbyte.ir.",
    );
  }
  if (env.NEXT_PUBLIC_API_BASE_URL !== "https://api.arbyte.ir/api/v1") {
    throw new Error(
      "Production NEXT_PUBLIC_API_BASE_URL must be https://api.arbyte.ir/api/v1.",
    );
  }
  if (
    process.env.API_INTERNAL_URL &&
    process.env.API_INTERNAL_URL !== "https://api.arbyte.ir/api/v1"
  ) {
    throw new Error(
      "Production API_INTERNAL_URL must be https://api.arbyte.ir/api/v1.",
    );
  }
}
