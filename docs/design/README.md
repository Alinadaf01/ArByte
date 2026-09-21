# docs/design

مرجع بصری پروژه. طبق بند ۱۲.۳ برند بوک و `ADR-004-design-tokens.md`، **این پوشه در هر تعارض بصری بر برند بوک اولویت دارد.**

- `storefront/` — طراحی کامل فروشگاه مشتری: ۱۹ صفحه + ۳ کامپوننت پوسته (`SiteHeader`, `MobileNav`, `SiteFooter`)، به‌صورت مرجع HTML با استایل inline. **کد پروداکشن نیست** — باید در `apps/web` با Tailwind/توکن‌های `packages/tokens` بازسازی شود، نه کپی. جزئیات کامل در `storefront/README.md`.
- `admin/` — طراحی پنل مدیریت (`T-100`). **کد پروداکشن نیست** — Vite + Vanilla JS + Tailwind v3، فونت Vazirmatn، رنگ اصلی آبی. زبان بصری (فاصله، شعاع، سایه، ریتم، الگوی سایدبار/کارت/جدول) از اینجا گرفته می‌شود؛ کد کپی نمی‌شود. در `apps/admin` با Next.js/React، توکن‌های `packages/tokens` (بنفش به‌جای آبی)، فونت Estedad، و آیکون Lucide بازساخته می‌شود. جدول نگاشت رنگ در `docs/adr/ADR-004-design-tokens.md`.

هر تصمیمی که طراحی با برند بوک متفاوت گرفته، در `docs/adr/ADR-004-design-tokens.md` ثبت شده است.
