# @arbyte/contracts

اسکیماهای Zod مشترک بین `apps/backend` (Django — قرارداد سیم، `pnpm contract:test`) و `apps/web` / `apps/admin` (تایپ کلاینت).
طبق ADR-001، این پکیج «Single Source of Truth» بند ۱۲.۳ برند بوک برای شکل داده‌ی بین Frontend و Backend است.

## وضعیت فعلی

فقط `ApiErrorSchema` (بند ۸.۹۳) اینجا تعریف شده — چون بخشی از زیرساخت خطا در T-000 است،
نه یک مدل داده‌ی کسب‌وکاری.

اسکیماهای موجودیت‌های واقعی (Product، Order، User، …) در **T-004 — API Contract** اضافه می‌شوند،
بعد از اینکه مدل داده در **T-003** مشخص شد.
