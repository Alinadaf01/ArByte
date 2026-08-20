# @arbyte/tokens

خروجی **T-001 — Design Tokens** اینجا می‌نشیند.

`index.css` عمداً خالی نگه داشته شده — طبق محدودیت T-000 («توکن‌ها را حدس نزن»)،
هیچ رنگ HEX، مقدار spacing یا تایپوگرافی در این تسک تعریف نشده است.

## قرارداد مصرف (برای T-001 و T-002)

- توکن‌ها باید به شکل CSS Variables باشند (ADR-001: Tailwind v4 + CSS Variables).
- مقیاس spacing باید بر پایه‌ی ۴px باشد (بند ۵.۸ برند بوک).
- دسته‌های حداقلی طبق بند ۵.۸۴: Colors، Typography، Spacing، Radius، Shadow، Breakpoints، Animation.
- هیچ کامپوننتی نباید مستقیماً رنگ HEX داشته باشد — فقط از این توکن‌ها مصرف کند
  (اجرای این قاعده در `packages/config` با ESLint rule `no-hex-colors` است).

`apps/web` و `apps/admin` این پکیج را در ورودی Tailwind خود import می‌کنند.
