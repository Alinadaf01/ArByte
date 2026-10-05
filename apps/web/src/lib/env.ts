import { appBaseUrl, publicApiBaseUrl } from "./urls";

/**
 * بند ۱۲.۱۳ و ۱۱.۱۰۸ برند بوک: هر متغیر محیطی در بوت اعتبارسنجی می‌شود.
 * اعتبارسنجی، نرمال‌سازی و گارد تولید Vercel در `lib/urls.ts` است (AUDIT-1
 * §12.8)؛ این‌جا فقط همان مقادیر نرمال‌شده برای import ساده.
 */
export const env = {
  NEXT_PUBLIC_APP_URL: appBaseUrl(),
  NEXT_PUBLIC_API_BASE_URL: publicApiBaseUrl(),
} as const;
