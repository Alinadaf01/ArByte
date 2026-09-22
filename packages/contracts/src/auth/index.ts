import { z } from "zod";
import { successResponseSchema } from "../common/response";
import { MobileSchema, OtpCodeSchema } from "../validators";

/**
 * قرارداد احراز هویت — T-004 §۳ (سند اصلی، بندهای ۱۱.۷/۱۱.۸) و §۶ (الحاقیه،
 * Impersonation). فقط شکل؛ منطق صدور/تأیید توکن در پیاده‌سازی واقعی است.
 */

export const AuthUserSchema = z.object({
  id: z.string(),
  mobile: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

/** الحاقیه §۶ — وقتی سشن جعل‌هویت است، فرانت باید همیشه بداند (نوار هشدار دائمی). */
export const ImpersonationContextSchema = z.object({
  by: z.string(),
  startedAt: z.string().datetime(),
});

// POST /auth/otp/request — عمومی
export const OtpRequestBodySchema = z.object({ mobile: MobileSchema });
export const OtpRequestResponseSchema = successResponseSchema(
  z.object({ expiresInSeconds: z.number().int().positive() }),
);

// POST /auth/otp/verify — عمومی
export const OtpVerifyBodySchema = z.object({
  mobile: MobileSchema,
  code: OtpCodeSchema,
});
export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: AuthUserSchema,
});
export const OtpVerifyResponseSchema = successResponseSchema(AuthTokensSchema);

// POST /auth/refresh — عمومی (نیازمند refreshToken معتبر)
export const RefreshBodySchema = z.object({ refreshToken: z.string() });
export const RefreshResponseSchema = successResponseSchema(
  z.object({ accessToken: z.string(), refreshToken: z.string() }),
);

// POST /auth/logout — نیازمند ورود
export const LogoutResponseSchema = successResponseSchema(z.object({}));

// GET /auth/me — نیازمند ورود
export const MeResponseSchema = successResponseSchema(
  AuthUserSchema.extend({
    /** فقط وقتی این سشن با بلیت Impersonation صادر شده باشد حاضر است. */
    impersonation: ImpersonationContextSchema.optional(),
  }),
);

/**
 * الحاقیه §۶ — تبدیل بلیت به سشن محدود. ⚠️ بلیت فقط در بدنه‌ی POST؛ هرگز در
 * URL/query (تاریخچه‌ی مرورگر، لاگ، هدر Referer).
 */
export const ImpersonateExchangeBodySchema = z.object({ ticket: z.string() });
export const ImpersonateExchangeResponseSchema = successResponseSchema(
  z.object({
    accessToken: z.string(),
    user: AuthUserSchema,
    impersonation: ImpersonationContextSchema,
  }),
);

/**
 * الحاقیه §۶ — شکل Payload توکن JWT برای سشن جعل‌هویت (نه یک درخواست/پاسخ
 * HTTP؛ برای Guard واقعی در پیاده‌سازی آینده). `imp: true` یعنی هر
 * اندپوینت نوشتنی باید IMPERSONATION_FORBIDDEN_ACTION برگرداند.
 */
export const JwtPayloadSchema = z.object({
  sub: z.string(),
  imp: z.literal(true).optional(),
  iat: z.number().int(),
  exp: z.number().int(),
});
export type JwtPayload = z.infer<typeof JwtPayloadSchema>;

/**
 * الحاقیه §۶ — اندپوینت‌های نوشتنی که در سشن جعل‌هویت مسدودند (برای Guard).
 * خواندن (سبد، سفارش‌ها، علاقه‌مندی، آدرس‌ها) همیشه آزاد است.
 */
export const IMPERSONATION_BLOCKED_ACTIONS = [
  "orders.create",
  "payments.initiate",
  "account.changePassword",
  "account.changeMobile",
  "account.addresses.write",
  "account.delete",
  "account.profile.update",
] as const;
