import { Injectable } from "@nestjs/common";
import {
  DEFAULT_FEATURE_FLAGS,
  type FeatureFlagsMap,
} from "./feature-flags.constants";
import type { FeatureFlagsRepository } from "./feature-flags.repository";

/**
 * جایگزین موقت تا T-003 جدول Settings را بسازد. پرچم‌ها در حافظه‌ی پردازش
 * نگهداری می‌شوند (نه فقط خواندن مستقیم env در هر بار درخواست) — قابل جایگزینی
 * با پیاده‌سازی Prisma-backed بدون تغییر در FeatureFlagsService یا مصرف‌کننده‌ها.
 */
@Injectable()
export class InMemoryFeatureFlagsRepository implements FeatureFlagsRepository {
  private flags: FeatureFlagsMap = { ...DEFAULT_FEATURE_FLAGS };

  async getAll(): Promise<FeatureFlagsMap> {
    return { ...this.flags };
  }

  async set(key: keyof FeatureFlagsMap, value: boolean): Promise<void> {
    this.flags[key] = value;
  }
}
