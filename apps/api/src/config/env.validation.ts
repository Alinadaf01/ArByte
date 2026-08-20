import { z } from "zod";

/**
 * بند ۱۱.۱۰۸ / ۱۲.۸۶ برند بوک: هیچ Secret نباید در کد hardcode شود و اگر مقدار
 * پیش‌فرض/نمونه‌ی همین .env.example روی محیط واقعی باقی بماند، بوت باید fail کند —
 * نباید بی‌صدا با یک Secret ناامن بالا بیاید.
 */
const INSECURE_PLACEHOLDER_VALUES = new Set([
  "replace-with-a-random-32-plus-character-secret",
  "replace-with-a-different-random-32-plus-character-secret",
  "replace-with-real-kavenegar-api-key",
  "changeme",
  "secret",
  "password",
]);

function notAPlaceholder(fieldLabel: string) {
  return (value: string, ctx: z.RefinementCtx) => {
    if (INSECURE_PLACEHOLDER_VALUES.has(value.toLowerCase())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${fieldLabel} هنوز مقدار نمونه‌ی .env.example است — یک مقدار واقعی و امن تنظیم کن.`,
      });
    }
  };
}

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  APP_PORT: z.coerce.number().int().positive().default(4000),
  APP_URL: z.string().url("APP_URL باید یک URL معتبر باشد"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL الزامی است"),

  REDIS_HOST: z.string().min(1, "REDIS_HOST الزامی است"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional().default(""),

  S3_ENDPOINT: z.string().min(1, "S3_ENDPOINT الزامی است"),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().min(1, "S3_BUCKET الزامی است"),
  S3_ACCESS_KEY_ID: z.string().min(1, "S3_ACCESS_KEY_ID الزامی است"),
  // بدون بررسی placeholder: در dev این مقدار عمداً با MINIO_ROOT_PASSWORD در
  // docker-compose.dev.yml یکی است؛ در Production طبیعتاً از آروان/S3 واقعی می‌آید.
  S3_SECRET_ACCESS_KEY: z.string().min(1, "S3_SECRET_ACCESS_KEY الزامی است"),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET باید حداقل ۳۲ کاراکتر باشد")
    .superRefine(notAPlaceholder("JWT_ACCESS_SECRET")),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET باید حداقل ۳۲ کاراکتر باشد")
    .superRefine(notAPlaceholder("JWT_REFRESH_SECRET")),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

  KAVENEGAR_API_KEY: z
    .string()
    .min(1, "KAVENEGAR_API_KEY الزامی است")
    .superRefine(notAPlaceholder("KAVENEGAR_API_KEY")),

  FEATURE_FLAGS_SOURCE: z.enum(["memory", "database"]).default("memory"),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(
      `پیکربندی محیطی apps/api نامعتبر است. apps/api/.env.example را ببین.\n${result.error.toString()}`,
    );
  }
  return result.data;
}
