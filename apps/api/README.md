# @arbyte/api

Backend — NestJS، منبع حقیقت سیستم (بند ۱۱.۴، ADR-001).

## ساختار

- `src/config` — اعتبارسنجی Zod برای env (بوت با پیام واضح fail می‌کند اگر چیزی غایب/ناامن باشد)
- `src/common/middleware` — `RequestIdMiddleware` (بند ۱۱.۹۰)
- `src/common/pipes` — `ZodValidationPipe` سراسری (بند ۱۱.۹۹)
- `src/common/filters` — `AllExceptionsFilter` که همه‌ی خطاها را به شکل بند ۸.۹۳ درمی‌آورد
- `src/health` — `/api/v1/health` با بررسی DB/Redis/Storage واقعی (بند ۱۱.۱۱۶)
- `src/feature-flags` — Configuration-Driven Architecture (بند ۱۲.۸۷) — جزئیات در README همان پوشه
- `src/diagnostics` — یک مسیر تستی موقت برای اثبات ساختار خطای بند ۸.۹۳؛ با اولین Endpoint واقعی حذف می‌شود
- `src/modules` — محل ماژول‌های کسب‌وکاری آینده (خالی در این تسک)

## اجرا

```
pnpm --filter @arbyte/api dev
```

Swagger فقط در `NODE_ENV !== production` روی `/api/docs` در دسترس است.
