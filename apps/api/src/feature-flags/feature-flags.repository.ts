import type { FeatureFlagsMap } from "./feature-flags.constants";

/**
 * انتزاع مخزن Feature Flags — طبق بند ۱۲.۸۷ (Configuration Driven Architecture)
 * پرچم‌ها باید در زمان اجرا قابل خواندن (و در آینده تغییر) باشند، نه فقط env.
 * پیاده‌سازی واقعی (خواندن/نوشتن از جدول Settings) در T-003 اضافه می‌شود؛
 * تا آن زمان InMemoryFeatureFlagsRepository این اینترفیس را پیاده می‌کند.
 */
export interface FeatureFlagsRepository {
  getAll(): Promise<FeatureFlagsMap>;
  set(key: keyof FeatureFlagsMap, value: boolean): Promise<void>;
}
