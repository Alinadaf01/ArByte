# @arbyte/ui

کامپوننت‌های مشترک بین `apps/web` و `apps/admin` (بند ۱۲.۱۷ — Component Architecture).
خروجی **T-002 — Core Components**، روی توکن‌های `packages/tokens` و مقادیر واقعی
`docs/design/storefront/README.md`.

هیچ کامپوننتی نباید رنگ HEX یا رشته‌ی فارسی hardcode داشته باشد — قانون ESLint در
`packages/config` این را در Build اجرا می‌کند. رشته‌های فارسی از props یا
`@arbyte/contracts` (لایه‌ی متن مرکزی) می‌آیند.

## کامپوننت‌ها (۱۹ مورد، بند ۴ الحاقیه)

| گروه    | کامپوننت‌ها                                                                                |
| ------- | ------------------------------------------------------------------------------------------ |
| فرم     | `Button` · `Input` · `Textarea` · `Select` · `Checkbox` · `Radio` · `Switch` · `FormField` |
| سطح     | `Card` · `Modal` · `Drawer` · `Sheet`                                                      |
| بازخورد | `Badge` · `Toast` · `Skeleton` · `Spinner` · `EmptyState`                                  |
| ناوبری  | `Tabs` · `Breadcrumb` · `Pagination`                                                       |
| کمکی    | `Tooltip` · `Divider` · `VisuallyHidden`                                                   |

`Modal`/`Drawer`/`Sheet`/`Select`/`Tabs`/`Tooltip` روی Radix UI ساخته شده‌اند (بند ۷
الحاقیه) — تله‌ی فوکوس، Escape، برگشت فوکوس، و ناوبری کیبورد رایگان.

## نمایش زنده

`apps/admin/src/app/dev/components` — همه‌ی کامپوننت‌ها در همه‌ی حالت‌ها. توجه: سند
تسک مسیر `_dev/components` را پیشنهاد داده بود، ولی Next.js App Router هر پوشه‌ی
شروع‌شده با `_` را «private folder» می‌داند و از سیستم روتینگ کنار می‌گذارد (۴۰۴
واقعی) — این‌جا از `dev/components` (بدون زیرخط) استفاده شده.

## جدول کنتراست (بند ۵.۵ الحاقیه)

اندازه‌گیری واقعی روی مرورگر (نه محاسبه‌ی دستی) — رنگ نهایی هر پس‌زمینه‌ی
آلفادار روی سفید با canvas ترکیب و نسبت WCAG محاسبه شده. آستانه‌ی AA برای متن
معمولی: **۴.۵:۱**.

| عنصر                            | پس‌زمینه           | متن                 | نسبت  | نتیجه                                 |
| ------------------------------- | ------------------ | ------------------- | ----- | ------------------------------------- |
| `Badge tone="success"`          | `bg-success/8`     | `text-success-text` | ۴.۵۷  | ✅                                    |
| `Badge tone="warning"`          | `bg-warning/5`     | `text-warning`      | ۴.۶۸  | ✅ (اولیه با `/10` فقط ۴.۴۶ بود — رد) |
| `Badge tone="info"`             | `bg-info/8`        | `text-info`         | ۴.۶۵  | ✅                                    |
| `Badge tone="neutral"`          | `bg-surface-muted` | `text-secondary-2`  | ۹.۵۷  | ✅                                    |
| `Badge tone="danger"`           | `bg-danger-tint`   | `text-danger`       | ۵.۸۱  | ✅                                    |
| `Badge tone="brand"`            | `bg-brand-tint-1`  | `text-brand-active` | ۶.۹۳  | ✅                                    |
| `Button variant="primary"`      | `bg-brand`         | `text-on-dark`      | ۵.۰۷  | ✅                                    |
| `Button variant="secondary"`    | `bg-primary` (ink) | `text-on-dark`      | ۱۸.۰۵ | ✅                                    |
| `Button variant="destructive"`  | `bg-danger`        | `text-on-dark`      | ۶.۵۷  | ✅                                    |
| `Toast` (پیش‌فرض `tone="dark"`) | `bg-surface-dark`  | `text-on-dark`      | ۱۸.۰۵ | ✅                                    |
| `Tooltip`                       | `bg-surface-dark`  | `text-on-dark`      | ۱۸.۰۵ | ✅ (همان توکن Toast)                  |
| `Pagination` (صفحه‌ی فعال)      | `bg-brand`         | `text-on-dark`      | ۵.۰۷  | ✅ (همان ترکیب Button primary)        |

درس مشترک با T-100: توکن‌های تک‌مقداری وضعیت (`--color-warning`, `--color-info`) هیچ
جفت تینت رسمی ندارند — به‌جای اختراع توکن جدید، از modifier شفافیت Tailwind
(`/8`, `/5`) روی همان توکن استفاده شد؛ درصد دقیق باید همیشه با اندازه‌گیری واقعی
تنظیم شود، نه حدس — نسخه‌ی اول Badge با `/10` تصمیم عجولانه بود و رد شد.

## چیزهایی که عمداً اینجا نیست

- `ProductCard`, `VariantSelector`, `PriceBlock`, `SpecTable`, `Gallery`, `OrderTimeline`,
  `FilterPanel` — ترکیبی‌اند، در فاز ۲ همراه صفحه‌ی خودشان می‌آیند (بند ۴ الحاقیه).
- `DataTable`/`Sidebar`/`Header`/`AdminShell` — مخصوص `apps/admin`، در همان‌جا می‌مانند
  (بند ۳ الحاقیه؛ ممیزی T-002 §۲ در `docs/api/README.md`‌-مانند گزارش نهایی تسک آمده).
