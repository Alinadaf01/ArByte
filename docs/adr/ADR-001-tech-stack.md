> Historical record: this predates the current implementation. The production backend is Django (`apps/backend`), not NestJS/Prisma. See `docs/DEPLOY.md` for the current architecture.

# ADR-001 — استک فنی ArByte

**وضعیت:** تأیید شده
**تاریخ:** ۲۸ مرداد ۱۴۰۵
**پر کننده‌ی خلأ:** برند بوک پارت ۱۱ لایه‌ها را تعریف کرده اما پیاده‌سازی را نه.

---

## تصمیم

| لایه             | انتخاب                                   | ارجاع به برند بوک                    |
| ---------------- | ---------------------------------------- | ------------------------------------ |
| Frontend         | **Next.js 15 (App Router) + TypeScript** | ۱۱.۲ Frontend، ۱۰.۲ SEO Architecture |
| Styling          | **Tailwind CSS v4 + CSS Variables**      | ۵.۸۴ Design Tokens، ۱۲.۱۹            |
| کامپوننت         | **shadcn/ui** (کپی‌شده، نه وابستگی)      | ۱۲.۱۸ Reusable Components            |
| Backend          | **NestJS + TypeScript**                  | ۱۱.۵ API Architecture، ۷.۲ Modular   |
| ORM              | **Prisma**                               | ۸.۸۲ Data Integrity                  |
| Database         | **PostgreSQL 16**                        | ۱۱.۲۹ Database Design                |
| Cache / Queue    | **Redis + BullMQ**                       | ۸.۸۵ Queue، ۸.۸۷ Caching، ۱۱.۹۲      |
| Storage          | **S3-compatible (MinIO یا آروان)**       | ۸.۸۹ Media Storage                   |
| Auth             | **JWT (access + refresh) + OTP**         | ۱۱.۷، ۱۱.۸ Passwordless              |
| Validation       | **Zod** (مشترک بین فرانت و بک)           | ۱۱.۹۹ API Validation                 |
| Test             | **Vitest + Playwright**                  | ۱۲.۱۱۱ Testing                       |
| Error Monitoring | **Sentry (self-hosted)**                 | ۱۱.۹۱                                |
| مونوریپو         | **pnpm workspaces + Turborepo**          | ۱۲.۱۷ Component Architecture         |

---

## چرا این ترکیب

**چرا Next.js:** برند بوک در پارت ۱۰ روی سئو بسیار سنگین سرمایه‌گذاری کرده — Structured Data (۱۰.۱۶)، Sitemap تقسیم‌شده (۱۰.۹)، Canonical (۱۰.۷۱)، Core Web Vitals (۱۰.۵۶). این‌ها با یک SPA کلاینت‌ساید عملاً شکست می‌خورند. Next.js با SSR/ISR این‌ها را ذاتاً حل می‌کند. ضمناً پشتیبانی RTL و `next/font` برای Estedad (بند ۴.۲۶).

**چرا NestJS جدا و نه فول‌استک Next:** بند ۱۱.۳ صریحاً «Separation of Concerns» و بند ۱۱.۴ «Backend as Source of Truth» را الزام کرده. بند ۸.۹۱ می‌گوید «به Frontend اعتماد نکن». اگر منطق قیمت‌گذاری و رزرو موجودی داخل Server Action های Next باشد، این مرز مبهم می‌شود. NestJS با ماژول‌ها و Guard ها، RBAC بند ۱۱.۱۷ را طبیعی پیاده می‌کند.

**چرا PostgreSQL نه MySQL:** بند ۸.۲۲ تا ۸.۲۸ یک سیستم مشخصات پویا (EAV) می‌خواهد. `JSONB` + `GIN index` در پستگرس این را بدون افت پرفورمنس حل می‌کند. ضمناً partial unique index برای Soft Delete (بند ۸.۸۱) و `SELECT ... FOR UPDATE` برای همزمانی موجودی (بند ۸.۸۳).

**چرا Prisma:** مایگریشن نسخه‌دار، تایپ‌سیفتی سرتاسری، و تراکنش‌های تودرتو برای بند ۸.۸۴ (Create Order + Order Items + Reserve Inventory + Notifications در یک تراکنش).

---

## ساختار مونوریپو

```
arbyte/
├─ apps/
│  ├─ web/          # Next.js — فروشگاه مشتری
│  ├─ admin/        # Next.js — پنل مدیریت (پارت ۷)
│  └─ api/          # NestJS
├─ packages/
│  ├─ ui/           # کامپوننت‌های مشترک (پارت ۵)
│  ├─ tokens/       # Design Tokens (بند ۵.۸۴)
│  ├─ contracts/    # اسکیماهای Zod + تایپ‌های API (بند ۸.۹۲)
│  └─ config/       # eslint / tsconfig / tailwind مشترک
├─ docs/
│  ├─ brandbook/
│  ├─ adr/
│  └─ api/
└─ infra/
   ├─ docker/
   └─ scripts/
```

**چرا `admin` جدا از `web`:** بند ۵.۸۱ می‌گوید فرانت «Experience First» و بک‌آفیس «Efficiency First» — دو فلسفه‌ی طراحی متفاوت. ضمناً باندل پنل ادمین هیچ‌وقت به دست مشتری نمی‌رسد (هم پرفورمنس، هم امنیت).

**چرا `packages/contracts`:** بند ۸.۹۲ API Contract را الزام کرده. با Zod، یک تعریف واحد هم ولیدیشن سمت سرور می‌شود، هم تایپ سمت کلاینت، هم مستندات. این عملی‌ترین شکل «Single Source of Truth» بند ۱۲.۳ است.

---

## قواعد الزامی (بند ۱۲.۸۶ — No Hardcoding)

1. هیچ رنگ HEX در کد کامپوننت — فقط توکن.
2. هیچ رشته‌ی فارسی داخل کامپوننت — همه از فایل متن مرکزی (بند ۲.۳۸ یکپارچگی زبان).
3. هیچ عدد جادویی برای spacing — فقط مقیاس ۴px (بند ۵.۸).
4. هیچ کلید API در کد — فقط env (بند ۱۱.۱۰۸).
5. هیچ محاسبه‌ی قیمت در فرانت — فقط API (بند ۸.۵۵).
6. هیچ کنترل دسترسی فقط در فرانت — Backend همیشه چک کند (بند ۱۱.۸۶).

---

## نکات محیط ایران

- رجیستری npm و Docker Hub از سرور ایران محدود است → آینه‌ی داخلی یا بیلد در محیط خارجی و انتقال ایمیج.
- Sentry ابری در دسترس نیست → نسخه‌ی self-hosted.
- Google Fonts در دسترس نیست → Estedad خودمیزبان (که بند ۴.۲۶ هم همین را می‌خواهد).
- کاوه‌نگار برای پیامک (بند ۸.۷۲) — پشت یک اینترفیس انتزاعی که بند ۱۱.۱۱ خواسته.

---

## موارد بازِ نیازمند تصمیم

- محل سرور (ایران / خارج) → `ADR-002`
- سرویس آبجکت استوریج (آروان، پارس‌پک، MinIO خودمیزبان) → `ADR-002`
- استراتژی CI/CD با توجه به محدودیت GitHub Actions → `ADR-003`
