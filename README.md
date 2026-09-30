# ArByte

[![CI](https://github.com/Alinadaf01/ArByte/actions/workflows/ci.yml/badge.svg)](https://github.com/Alinadaf01/ArByte/actions/workflows/ci.yml)

Current production architecture: [docs/DEPLOY.md](docs/DEPLOY.md). The linked ADRs are historical and may describe superseded choices.

فروشگاه اینترنتی پریمیوم محصولات تکنولوژی — بازار ایران، RTL فارسی.

منابع حقیقت این پروژه:

- [Brand Book](docs/brandbook/BrandBook%20ArByte.docx)
- [ADR-001 — استک فنی](docs/adr/ADR-001-tech-stack.md)
- [ADR-002 — زیرساخت و هاستینگ](docs/adr/ADR-002-infrastructure.md)

## Tech Stack

| لایه          | انتخاب                                                           |
| ------------- | ---------------------------------------------------------------- |
| فروشگاه       | Next.js 15 (App Router، BFF با کوکی httpOnly) + TypeScript       |
| پنل مدیریت    | React + Vite (پنل وایب با هویت آربایت)                           |
| Backend       | Django 5.2 + DRF (`apps/backend`) — منبع حقیقت سیستم             |
| Database      | PostgreSQL 16                                                    |
| Cache / Queue | Redis + Celery (worker + beat)                                   |
| اسناد PDF     | Playwright Chromium (فاکتور، برگه‌ی بسته‌بندی، کارت گارانتی)     |
| Validation    | Zod (`packages/contracts`) — قرارداد سیم با `pnpm contract:test` |
| Test          | Django test + Vitest + Playwright (E2E)                          |
| مونوریپو      | pnpm workspaces + Turborepo                                      |

## ساختار پوشه‌ها

```
arbyte/
├─ apps/
│  ├─ web/          Next.js — فروشگاه
│  ├─ admin/        React/Vite — پنل مدیریت
│  └─ backend/      Django — API عمومی (/api/v1)، API پنل (/api/admin)، Celery
├─ packages/
│  ├─ ui/           کامپوننت‌های مشترک
│  ├─ tokens/       Design Tokens
│  ├─ contracts/    اسکیماهای Zod + تست قرارداد
│  └─ config/       eslint / tsconfig / tailwind / prettier مشترک
├─ docs/            برندبوک، ADR، API، مدل داده (خودکار)، گزارش‌ها
└─ infra/docker/    docker-compose توسعه (Postgres + Redis)
```

## پیش‌نیازها

Node.js ≥ 22 و pnpm (`corepack enable`)، Python 3.12، Docker.

## راه‌اندازی dev از صفر در ۵ قدم

```bash
# ۱) وابستگی‌ها
pnpm install
python3.12 -m venv apps/backend/.venv
apps/backend/.venv/bin/pip install -r apps/backend/requirements.txt
apps/backend/.venv/bin/playwright install chromium

# ۲) Postgres (پورت 5435) و Redis
docker compose -f infra/docker/docker-compose.dev.yml up -d

# ۳) متغیرهای محیطی از نمونه‌ها
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env

# ۴) دیتابیس، داده‌ی نمونه و مدیر
pnpm be:migrate
pnpm be:manage seed_arbyte
pnpm be:manage createsuperuser

# ۵) اجرا (دو ترمینال)
pnpm be:dev        # Django → http://localhost:8000
pnpm dev           # فروشگاه → :3000 ، پنل → :3001
```

⚠️ اپ‌ها بدون `.env` معتبر با خطای واضح در بوت fail می‌کنند (عمدی؛ بند ۱۱.۱۰۸ برندبوک).
Celery در dev با `CELERY_TASK_ALWAYS_EAGER=True` بدون worker هم کار می‌کند.

## اسکریپت‌ها

| دستور                                       | توضیح                                                     |
| ------------------------------------------- | --------------------------------------------------------- |
| `pnpm dev`                                  | فروشگاه و پنل (Turborepo)                                 |
| `pnpm be:dev`                               | Django روی 8000                                           |
| `pnpm be:test`                              | تست‌های Django                                            |
| `pnpm be:lint`                              | ruff                                                      |
| `pnpm be:manage …`                          | هر دستور `manage.py`                                      |
| `pnpm build`                                | build فروشگاه و پنل                                       |
| `pnpm lint`                                 | ESLint (شامل قانون ضد HEX)                                |
| `pnpm typecheck`                            | TypeScript                                                |
| `pnpm test`                                 | تست‌های یونیت (Vitest)                                    |
| `pnpm test:e2e`                             | E2E فروشگاه (Playwright)                                  |
| `pnpm contract:test`                        | قرارداد Zod روی Django زنده (`CONTRACT_API_URL=…/api/v1`) |
| `pnpm --filter @arbyte/web seo:audit [URL]` | ممیزی سئو                                                 |

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
- [docs/api](docs/api) — مستندات API عمومی و پنل
- [docs/data-model.md](docs/data-model.md) و [docs/erd.md](docs/erd.md) — خودکار از مدل‌های Django (`pnpm be:manage generate_data_model`)
- هر پکیج/اپ یک `README.md` محلی دارد که وضعیت فعلی و مرز آن با تسک‌های بعدی را توضیح می‌دهد.
