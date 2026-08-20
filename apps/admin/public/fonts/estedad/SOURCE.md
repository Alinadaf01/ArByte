# منبع فونت Estedad

فایل‌های `Estedad-400.woff2` / `500` / `600` / `700` از پکیج رسمی npm
`@fontsource/estedad` (subset عربی/فارسی) استخراج شده‌اند — فونت اصلی توسط
[rastikerdar/estedad-font](https://github.com/rastikerdar/estedad-font) منتشر شده
و تحت SIL Open Font License 1.1 است (متن کامل در `OFL.txt`).

دلیل استخراج به‌جای import مستقیم پکیج: بند ۴.۲۹ برند بوک فقط وزن‌های
۴۰۰/۵۰۰/۶۰۰/۷۰۰ را خواسته و کنترل preload انتخابی (فقط ۴۰۰ و ۷۰۰) نیاز به
فایل‌های محلی مستقیم دارد که با `next/font/local` (`src/lib/fonts.ts`) بارگذاری می‌شوند.

Google Fonts از ایران در دسترس نیست (ADR-001) — به همین دلیل فونت باید خودمیزبان باشد.
