/**
 * پرچم‌های اولیه — بند ۱۲.۶۳ و ۱۲.۸۷ برند بوک.
 * این مقادیر فقط seed اولیه هستند، نه منبع حقیقتِ زمان اجرا — منبع حقیقت
 * FeatureFlagsRepository است (ر.ک. README همین پوشه).
 */
export const DEFAULT_FEATURE_FLAGS = {
  PAYMENT_GATEWAY_ENABLED: false,
  SMS_ENABLED: true,
  MAINTENANCE_MODE: false,
  REVIEWS_ENABLED: false,
  BLOG_ENABLED: false,
  TOROB_FEED_ENABLED: false,
} as const;

export type FeatureFlagKey = keyof typeof DEFAULT_FEATURE_FLAGS;
export type FeatureFlagsMap = Record<FeatureFlagKey, boolean>;

export const FEATURE_FLAGS_REPOSITORY = Symbol("FEATURE_FLAGS_REPOSITORY");
