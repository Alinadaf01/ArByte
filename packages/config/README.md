# @arbyte/config

پیکربندی‌های مشترک برای همه‌ی اپ‌ها و پکیج‌های مونوریپو.

- `eslint/index.js` — کانفیگ پایه (JS/TS + قانون سفارشی ضد HEX روی فایل‌های `.tsx`/`.jsx`)
- `eslint/next.js` — کانفیگ پایه + `next/core-web-vitals` (برای `apps/web`, `apps/admin`)
- `eslint/nest.js` — کانفیگ پایه با تنظیمات NestJS (برای `apps/api`)
- `eslint-rules/no-hex-colors.js` — قانون سفارشی: بند ۱۲.۸۶ برند بوک را اجرا می‌کند (هیچ رنگ HEX در کامپوننت)
- `typescript/*.json` — `tsconfig` پایه با `strict: true`
- `tailwind/index.js` — کانفیگ پایه‌ی Tailwind v4 (رنگ/spacing/radius از `packages/tokens` می‌آید، نه از اینجا)
- `prettier.config.js` — فرمت مشترک

هیچ توکن طراحی (رنگ، فاصله، تایپوگرافی) در این پکیج تعریف نشده — منبع آن `packages/tokens` است (خروجی T-001).
