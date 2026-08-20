# ArByte

فروشگاه اینترنتی پریمیوم محصولات تکنولوژی — بازار ایران، RTL فارسی.

منابع حقیقت این پروژه:

- [Brand Book](docs/brandbook/BrandBook%20ArByte.docx)
- [ADR-001 — استک فنی](docs/adr/ADR-001-tech-stack.md)
- [ADR-002 — زیرساخت و هاستینگ](docs/adr/ADR-002-infrastructure.md)

## Tech Stack

| لایه          | انتخاب                                                   |
| ------------- | -------------------------------------------------------- |
| Frontend      | Next.js 15 (App Router) + TypeScript، خروجی `standalone` |
| Styling       | Tailwind CSS v4 + CSS Variables (`packages/tokens`)      |
| Backend       | NestJS + TypeScript                                      |
| Database      | PostgreSQL 16 (ORM: Prisma — از T-003)                   |
| Cache / Queue | Redis + BullMQ                                           |
| Storage       | S3-compatible (MinIO در dev)                             |
| Auth          | JWT (access + refresh) + OTP                             |
| Validation    | Zod، مشترک بین Frontend و Backend (`packages/contracts`) |
| Test          | Vitest (یونیت) + Playwright (E2E)                        |
| مونوریپو      | pnpm workspaces + Turborepo                              |

جزئیات و چراییِ هر انتخاب در [ADR-001](docs/adr/ADR-001-tech-stack.md).

## ساختار پوشه‌ها

```
arbyte/
├─ apps/
│  ├─ web/          Next.js — فروشگاه مشتری (Experience First)
│  ├─ admin/        Next.js — پنل مدیریت (Efficiency First)
│  └─ api/           NestJS — منبع حقیقت سیستم
├─ packages/
│  ├─ ui/           کامپوننت‌های مشترک (خروجی T-002)
│  ├─ tokens/       Design Tokens (خروجی T-001)
│  ├─ contracts/    اسکیماهای Zod مشترک بین Frontend/Backend
│  └─ config/       eslint / tsconfig / tailwind / prettier مشترک
├─ docs/
│  ├─ brandbook/
│  ├─ adr/
│  └─ api/
└─ infra/
   └─ docker/
```

## پیش‌نیازها

- Node.js ≥ 22
- pnpm (نسخه در `packageManager` روت مشخص است — با `corepack enable` یا `npm i -g pnpm` نصب کن)
- Docker + Docker Compose (برای سرویس‌های محلی)

## راه‌اندازی

```bash
pnpm install

# متغیرهای محیطی هر اپ را از نمونه کپی کن و مقداردهی کن
cp apps/web/.env.example apps/web/.env
cp apps/admin/.env.example apps/admin/.env
cp apps/api/.env.example apps/api/.env

# سرویس‌های زیرساختی محلی
docker compose -f infra/docker/docker-compose.dev.yml up -d

pnpm dev
```

- `apps/web` → http://localhost:3000
- `apps/admin` → http://localhost:3001
- `apps/api` → http://localhost:4000/api/v1 (Swagger در `/api/docs`, فقط dev)

⚠️ هر سه اپ بدون `.env` معتبر با خطای واضح در بوت fail می‌کنند — این عمدی است
(بند ۱۱.۱۰۸، ۱۲.۱۳ برند بوک؛ ر.ک. `src/config/env.validation.ts` در `apps/api` و
`src/lib/env.ts` در `apps/web`/`apps/admin`).

## اسکریپت‌ها

| دستور            | توضیح                                        |
| ---------------- | -------------------------------------------- |
| `pnpm dev`       | اجرای هم‌زمان هر سه اپ (Turborepo)           |
| `pnpm build`     | Build پروداکشن هر سه اپ                      |
| `pnpm lint`      | ESLint روی همه‌ی پکیج‌ها (شامل قانون ضد HEX) |
| `pnpm typecheck` | بررسی تایپ TypeScript                        |
| `pnpm test`      | تست‌های یونیت (Vitest)                       |
| `pnpm test:e2e`  | تست‌های E2E (Playwright)                     |
| `pnpm format`    | فرمت با Prettier                             |

## Docker

```bash
docker compose -f infra/docker/docker-compose.dev.yml up -d
```

جزئیات بیلد ایمیج پروداکشن در [infra/docker/README.md](infra/docker/README.md).

## Git Workflow

طبق بند ۱۲.۱۰۹ برند بوک:

```
main         → پروداکشن
develop      → یکپارچه‌سازی
feature/T-XXX-توضیح-کوتاه
fix/...
```

Commit ها باید از Conventional Commits پیروی کنند (`commitlint.config.js`).
هر برنچ باید به شناسه‌ی تسک ارجاع بدهد.

## قواعد غیرقابل مذاکره

۱. هیچ رنگ HEX در کد کامپوننت — فقط توکن سمنتیک (اجرا با ESLint rule در `packages/config`)
۲. هیچ رشته‌ی فارسی داخل کامپوننت — از لایه‌ی متن مرکزی
۳. هیچ عدد spacing خارج از مقیاس ۴px
۴. هیچ محاسبه‌ی قیمت در فرانت‌اند — فقط API
۵. کنترل دسترسی همیشه سمت سرور هم چک شود
۶. اگر تصمیمی در برند بوک نیست، حدس زده نمی‌شود — سوال مطرح می‌شود

## مستندسازی

- [docs/adr](docs/adr) — تصمیمات معماری
- [docs/api](docs/api) — مستندات API (تکمیل در T-004)
- هر پکیج/اپ یک `README.md` محلی دارد که وضعیت فعلی و مرز آن با تسک‌های بعدی را توضیح می‌دهد.
