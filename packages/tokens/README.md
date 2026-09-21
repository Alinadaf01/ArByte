# @arbyte/tokens

خروجی **T-001 — Design Tokens**، از روی `docs/design/storefront/README.md`
(نه بند ۴/۵ برند بوک — دلیل و لیست کامل تفاوت‌ها در
`docs/adr/ADR-004-design-tokens.md`).

## چطور استفاده کن

`apps/web` و `apps/admin` این فایل را در ورودی Tailwind خودشان import می‌کنند:

```css
@import "tailwindcss";
@import "@arbyte/tokens";
```

از آن به بعد کلاس‌های Tailwind زیر خودکار در دسترس‌اند (نمونه، نه لیست کامل):

- رنگ: `bg-paper`, `bg-surface`, `text-primary`, `text-secondary`, `border-border`, `bg-brand`, `text-brand-active`, `bg-brand-tint-1`, `text-accent`, `text-danger`, `text-warning`
- شعاع: `rounded-card`, `rounded-card-lg`, `rounded-panel`, `rounded-chip`, `rounded-pill`, `rounded-icon-button`
- سایه: `shadow-card`, `shadow-popover`, `shadow-drawer`, `shadow-sheet`, `shadow-bottom-nav`, `shadow-button-accent`
- تایپوگرافی: `font-sans` (Estedad)، `text-hero`, `text-h2`, `text-subhead`, `text-card-title`, `text-body`, `text-caption`, `text-micro`, `text-input`
- انیمیشن: `animate-pop`, `animate-pop-a`/`animate-pop-b` (جفت retrigger برای تغییر تعداد)، `animate-shake`/`animate-shake-b` (جفت retrigger برای خطا)، `animate-toast-in`, `animate-badge-pop`, `animate-rise`, `animate-fade-in`, `animate-spin`, `animate-step-in`
- Spacing: مقیاس عددی استاندارد Tailwind (`p-4`, `gap-6`, ...) چون `--spacing: 4px` تنظیم شده — یعنی `p-4` = ۱۶px، `gap-6` = ۲۴px، دقیقاً مطابق مقیاس ۴px بند ۵.۸ برند بوک.
- Breakpoint: `md:` = تبلت به بالا (۷۶۸px)، `lg:` = دسکتاپ به بالا (۱۰۲۴px). موبایل حالت پیش‌فرض بدون پیشوند است (Mobile First، چون ۹۰٪ ترافیک موبایل است).

## قاعده‌ی مهم

**هیچ‌وقت مقدار HEX یا px خام در کامپوننت ننویس** — فقط از کلاس‌های بالا یا `var(--color-*)`/`var(--text-*)`/... استفاده کن. قانون ESLint `no-hex-colors` در `packages/config` این را در فایل‌های `.tsx`/`.jsx` اجرا می‌کند.

## دو لایه‌ی داخلی فایل

- `:root` — پالت خام (`--palette-*`). این‌ها **مستقیم مصرف نمی‌شوند** — فقط برای این هستند که افزودن حالت تیره در آینده یک تغییر در یک‌جا باشد.
- `@theme` — توکن سمنتیک Tailwind v4 (`--color-*`, `--radius-*`, `--shadow-*`, `--text-*`, `--animate-*`, ...) که کلاس تولید می‌کند. کامپوننت‌ها فقط با این کلاس‌ها کار دارند.

## چیزهایی که عمداً اینجا نیست

- `--color-success` و `--color-info` تعریف شده‌اند اما در ۱۹ صفحه‌ی فروشگاه مصرف نمی‌شوند — رزرو برای پنل ادمین/Backend طبق بند ۴.۲۰ برند بوک (ر.ک. ADR-004، بخش «سؤال باز»).
- انیمیشن‌های محیطی صفحه‌ی Login (`arbOrb1-3`, `arbMesh`, `arbRing`, `arbHalo`, `arbDraw`) اینجا نیستند — مخصوص همان یک صفحه‌اند، در `apps/web` محلی تعریف می‌شوند.
- فرمت قیمت (`money()`) اینجا نیست — منطق است نه توکن؛ در `packages/contracts/src/format/` است. توجه: نمونه‌ی طراحی از `٫` (U+066B) به‌جای `٬` (U+066C) به‌عنوان جداکننده‌ی هزارگان استفاده کرده — این باگ در فرمتر واقعی تکرار نمی‌شود (ر.ک. ADR-004).
