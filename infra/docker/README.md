# infra/docker

## محیط توسعه

```
docker compose -f infra/docker/docker-compose.dev.yml up -d
```

سرویس‌ها: PostgreSQL 16 (`5432`), Redis 7 (`6379`), MinIO S3-compatible (`9000` API / `9001` کنسول),
Mailpit (`1025` SMTP / `8025` UI). این مقادیر باید با `apps/api/.env` هماهنگ باشند
(ر.ک. `apps/api/.env.example`). این credential ها فقط برای dev هستند و نباید در
Production استفاده شوند.

## بیلد ایمیج پروداکشن

هر Dockerfile باید از **ریشه‌ی مونوریپو** بیلد شود (نه از داخل `apps/*`) چون به
`turbo prune` برای جدا کردن فقط وابستگی‌های همان اپ نیاز دارد:

```
docker build -f infra/docker/web.Dockerfile   -t arbyte/web   .
docker build -f infra/docker/admin.Dockerfile -t arbyte/admin .
docker build -f infra/docker/api.Dockerfile   -t arbyte/api   .
```

طبق ADR-002، بیلد در محیطی با دسترسی آزاد به رجیستری npm/Docker Hub انجام می‌شود
و فقط ایمیج نهایی (خودکفا، non-root، بدون نیاز به نصب در زمان اجرا) به سرور ایران
منتقل می‌شود.
