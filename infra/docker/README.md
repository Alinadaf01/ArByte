# infra/docker

## محیط توسعه

```
docker compose -f infra/docker/docker-compose.dev.yml up -d
```

سرویس‌ها: PostgreSQL 16 (`5435` روی هاست، دیتابیس `arbyte_dj`) و Redis 7 (`6379`) —
هماهنگ با `apps/backend/.env.example`. این credentialها فقط برای dev هستند.
(MinIO/Mailpit در G-03 حذف شدند: Django media را روی دیسک نگه می‌دارد و ایمیل نمی‌فرستد.)

## بیلد ایمیج پروداکشن

هر Dockerfile باید از **ریشه‌ی مونوریپو** بیلد شود (نه از داخل `apps/*`) چون به
`turbo prune` برای جدا کردن فقط وابستگی‌های همان اپ نیاز دارد:

```
docker build -f infra/docker/web.Dockerfile   -t arbyte/web   .
docker build -f infra/docker/admin.Dockerfile -t arbyte/admin .
```

طبق ADR-002، بیلد در محیطی با دسترسی آزاد به رجیستری npm/Docker Hub انجام می‌شود
و فقط ایمیج نهایی (خودکفا، non-root، بدون نیاز به نصب در زمان اجرا) به سرور ایران
منتقل می‌شود.
