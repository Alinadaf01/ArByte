# Feature Flags

طبق بند ۱۲.۸۷ برند بوک، پرچم‌ها باید Configuration-Driven باشند و در زمان اجرا از
دیتابیس/تنظیمات خوانده شوند — نه فقط از env.

فعلاً `InMemoryFeatureFlagsRepository` این قرارداد را با نگهداری در حافظه‌ی پردازش
پیاده‌سازی می‌کند (seed از `feature-flags.constants.ts`). وقتی **T-003 — Data Model**
جدول `Settings` را ساخت، یک `PrismaFeatureFlagsRepository` جای آن در
`feature-flags.module.ts` می‌نشیند — بدون نیاز به تغییر `FeatureFlagsService` یا
هیچ‌کدام از مصرف‌کننده‌ها.
