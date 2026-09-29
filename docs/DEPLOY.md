# راهنمای استقرار آربایت

معماری (همان وایب‌شاپ):

| بخش                         | کجا                              | دامنه                            |
| --------------------------- | -------------------------------- | -------------------------------- |
| فروشگاه (Next.js)           | **Vercel**                       | `arbyte.ir` (و `www` → ریدایرکت) |
| API (Django + Celery + PDF) | **سرور ایران**، Docker           | `api.arbyte.ir`                  |
| پنل مدیریت (build ایستا)    | **سرور ایران**، داخل ایمیج nginx | `admin.arbyte.ir`                |

فایل‌ها:

- `docker-compose.prod.yml`
- `deploy/setup.sh` (راه‌اندازی یک‌باره)
- `deploy/deploy.sh` (به‌روزرسانی بی‌قطعی)
- `deploy/backup.sh` و `deploy/restore.sh`
- `deploy/nginx/`
- `.env.production.example`
- `scripts/smoke.sh` و `scripts/measure-latency.sh`
- `.github/workflows/build-images.yml`

> این مجموعه روی Docker واقعی آزمایش شد (با دامنه‌ی آزمایشی و گواهی خودامضا):
>
> - همه‌ی سرویس‌ها سالم بالا آمدند؛ smoke و پنل در مرورگر سبز بودند.
> - `deploy.sh` کانتینر web را **بدون حتی یک درخواست ناموفق** جابه‌جا کرد. فقط وقتی ایمیج پنل عوض می‌شود، جایگزینی nginx حدود نیم ثانیه قطعی دارد.
> - بک‌آپ → حذف داده → `restore.sh` → داده و فایل برگشت.

---

## ۱. پیش‌نیازها

- **سرور ایران**: Ubuntu 22.04 یا 24.04، حداقل ۲ vCPU، ۴GB رم و ۶۰GB دیسک، دسترسی SSH با کلید.
- **دامنه** `arbyte.ir` با دسترسی به DNS.
- **GitHub** همین مخزن: ایمیج‌ها در Actions ساخته می‌شوند.
- **Docker Hub** (پیشنهادی، رایگان): از سرور ایران پایدارتر از GHCR است.
- **Vercel** برای فروشگاه.

## ۲. ساخت ایمیج‌ها (بیرون از ایران)

سرور ایران ایمیج نمی‌سازد، چون PyPI و npm و دانلود Chromium از ایران قابل اتکا نیست. ایمیج‌ها را workflow «Build images» می‌سازد: **arbyte-backend** (Django و Chromium برای PDF) و **arbyte-nginx** (پنل build‌شده و nginx).

1. در GitHub: Settings → Secrets and variables → Actions → `DOCKERHUB_USER` و `DOCKERHUB_TOKEN` (اختیاری ولی پیشنهادی).
2. هر push به `main` (یا Actions → Build images → Run workflow) ایمیج‌ها را با تگ SHA کامیت و `latest` می‌سازد.

### الف) مسیر عادی: pull

در `.env.production`، `IMAGE_REGISTRY=docker.io/<DOCKERHUB_USER>` (یا `ghcr.io/<owner>`) و `IMAGE_TAG=<sha>` بگذارید. `deploy.sh` خودش pull می‌کند، با ۵ بار تلاش مجدد برای لینک ناپایدار.

### ب) مسیر آفلاین: وقتی رجیستری از سرور در دسترس نیست

1. در صفحه‌ی اجرای workflow، artifact **arbyte-images-<sha>** را دانلود کنید (`docker save` هر دو ایمیج، gzip).
2. `scp arbyte-images-<sha>.tar.gz deploy@<IP>:~/arbyte/deploy/incoming/`
3. روی سرور: `./deploy/deploy.sh <sha>`. فایل‌های `incoming/` خودکار `docker load` می‌شوند. در این حالت `IMAGE_REGISTRY` باید همان `ghcr.io/<owner>` باشد (نام داخل آرشیو).

## ۳. سرور ایران، قدم‌به‌قدم

**DNS** (نزد ثبت‌کننده‌ی دامنه):

| رکورد               | مقدار   |
| ------------------- | ------- |
| `api.arbyte.ir` A   | IP سرور |
| `admin.arbyte.ir` A | IP سرور |

```bash
# ۰) کد (فقط فایل‌های استقرار لازم است؛ اگر GitHub از سرور باز نیست، مخزن را zip و scp کنید)
ssh root@<IP>
git clone https://github.com/Alinadaf01/ArByte.git /home/deploy/arbyte   # یا scp
cd /home/deploy/arbyte

sudo ./deploy/setup.sh 1   # کاربر deploy، فایروال ۲۲/۸۰/۴۴۳، fail2ban، سواپ، به‌روزرسانی امنیتی
# خروج و ورود دوباره: ssh deploy@<IP>
./deploy/setup.sh 2        # Docker
./deploy/setup.sh 3        # .env.production با secretهای تصادفی — سه مقدار چاپ‌شده را نگه دارید
nano .env.production       # IMAGE_REGISTRY، IMAGE_TAG، KAVENEGAR_API_KEY، CERTBOT_EMAIL
./deploy/setup.sh 4        # دریافت ایمیج‌ها (pull یا incoming/)
./deploy/setup.sh 5        # migrate، سرویس‌ها، گواهی Let's Encrypt، nginx با SSL
docker compose --env-file .env.production -f docker-compose.prod.yml exec web python manage.py createsuperuser
./deploy/setup.sh 6        # cron: بک‌آپ روزانه ۰۳:۳۰ + تمدید گواهی
./deploy/setup.sh 7        # smoke
```

بعد از ورود به `https://admin.arbyte.ir`، در پنل → تنظیمات:

- **اطلاعات فروشگاه**: نام، شناسه‌ی ملی، کد اقتصادی، نشانی، تلفن، ایمیل، شبکه‌های اجتماعی، نماد اعتماد (اینماد) و **«شماره‌های اعلان»** (پیامک سفارش تازه به مدیر، چند شماره با کاما).
- **کارت‌به‌کارت**: نام صاحب حساب، شماره کارت، شبا. تا کامل نشود، روش پرداخت در تسویه نمایش داده نمی‌شود.
- **کلیدهای API → کاوه‌نگار**: کلید `apiKey`، سپس «ارسال پیامک آزمایشی». اگر `KAVENEGAR_API_KEY` در env باشد و پنل خالی باشد، از env استفاده می‌شود. قالب‌های `arbyteotp`، `arbyteorder`، `arbyteadmin` و `arbyteship` باید در کاوه‌نگار تأیید شده باشند.
- **صفحه‌های محتوا**: درباره ما و اسناد قوانین. تا پر نشوند، در سایت پنهان‌اند.

## ۴. Vercel (فروشگاه)

### ۴.۱ پروژه

1. New Project → همین مخزن.
2. **Root Directory**: `apps/web`. Framework: Next.js. Vercel خودش pnpm و workspace را تشخیص می‌دهد.
3. **Node.js**: 22.x.
4. Region توابع: **Frankfurt (fra1)**، نزدیک‌ترین ناحیه به ایران (§۴.۳).

### ۴.۲ متغیرها (Production)

| نام                        | مقدار                          |
| -------------------------- | ------------------------------ |
| `NEXT_PUBLIC_APP_URL`      | `https://arbyte.ir`            |
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.arbyte.ir/api/v1` |
| `API_INTERNAL_URL`         | `https://api.arbyte.ir/api/v1` |
| `REVALIDATE_SECRET`        | همان مقدار `.env.production`   |
| `BFF_SHARED_SECRET`        | همان مقدار `.env.production`   |

**دامنه‌ها**: `arbyte.ir` را Primary کنید و `www.arbyte.ir` را اضافه کنید با گزینه‌ی «Redirect to arbyte.ir» (۳۰۸). DNS: `arbyte.ir` A → `76.76.21.21`، `www` CNAME → `cname.vercel-dns.com` (یا مقداری که Vercel نشان می‌دهد).

در `.env.production` سرور، `STOREFRONT_URL=https://arbyte.ir` باشد تا ذخیره در پنل، صفحه‌ها را فوراً تازه کند.

### ۴.۳ زمان پاسخ Vercel ↔ ایران

فروشگاه SSR است و هر صفحه از Vercel (خارج) به API داخل ایران درخواست می‌زند. کش‌ها:

- داده‌ی API در Next با `revalidate` ۳۰ تا ۶۰ ثانیه (و ۳۰۰ ثانیه برای site-info و قوانین) کش می‌شود، پس بیشتر درخواست‌ها به ایران نمی‌رسند.
- پنل بعد از ذخیره revalidate می‌زند.
- API برای GETهای عمومی `Cache-Control` و `ETag` دارد.

اندازه‌گیری بعد از استقرار (یک بار از لپ‌تاپ داخل ایران، یک بار از یک سرور در اروپا):

```bash
scripts/measure-latency.sh https://arbyte.ir https://api.arbyte.ir 7
```

هدف: TTFB فروشگاه زیر ۸۰۰ms و API از اروپا زیر ۵۰۰ms.

### ۴.۴ اگر API از بیرون ایران در دسترس نبود یا کند بود

فیلترینگ ورودی گاهی ترافیک خارجی به سرورهای ایران را می‌بندد. گزینه‌ها، به ترتیب سادگی:

1. **CDN ایرانی با لبه‌ی خارج** (مثلاً آروان) جلوی `api.arbyte.ir`: Vercel به لبه‌ی CDN وصل می‌شود، نه مستقیم به سرور.
2. **رله‌ی خارجی**: یک VPS کوچک در اروپا با nginx که `api.arbyte.ir` را reverse-proxy کند. DNS `api` به رله، رله به IP ایران.
3. **فروشگاه هم در ایران**: `infra/docker/web.Dockerfile` (خروجی standalone) روی همین سرور با یک server block تازه برای `arbyte.ir`. در این حالت Vercel حذف می‌شود و قطعی بین‌الملل روی فروشگاه اثری ندارد، ولی CDN جهانی Vercel را از دست می‌دهید.

## ۵. پرداخت در لانچ

- **بله‌پی**: افزونه‌ی ووکامرس رمزگذاری‌شده و وابسته به لایسنس وردپرس است و قابل استفاده نیست (`docs/payments/BALEPAY.md`). تا مستندات رسمی API بله برای فروشندگان برسد، غیرفعال می‌ماند.
- **کارت‌به‌کارت دستی** روش پرداخت لانچ است: مشتری رسید آپلود می‌کند، ادمین در پنل تأیید می‌کند.
- **زرین‌پال یا درگاه دیگر**: کافی است در پنل → تنظیمات → کلیدهای API ردیف درگاه (زرین‌پال: کلید `merchantId`) را اضافه و «فعال» کنید. provider موجود **بدون کد تازه** در تسویه نمایش داده می‌شود. پیش از فعال‌سازی واقعی آزمون sandbox بگیرید:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec web python manage.py payment_sandbox_check zarinpal
```

این دستور همیشه روی sandbox زرین‌پال درخواست می‌سازد و لینک پرداخت آزمایشی را چاپ می‌کند (بدون سفارش واقعی). برای پرداخت آزمایشی سرتاسری، «حالت آزمایشی» همان ردیف را روشن کنید، یک خرید کنید و بعد خاموشش کنید.

## ۶. بک‌آپ و بازگردانی

- **خودکار**: هر شب ۰۳:۳۰ (cron مرحله‌ی ۶)، در `deploy/backups/<تاریخ>/` با این محتوا:
  - `db.dump` (pg_dump)
  - `media.tar.gz`
  - `private_media.tar.gz` (رسیدها)
  - `SHA256SUMS`

  نگه‌داری `BACKUP_RETENTION_DAYS=14` روز است. با پر بودن `BACKUP_S3_*`، یک کپی هم بیرون از سرور (مثلاً آروان) می‌رود.

- **دستی**: `./deploy/backup.sh`
- **بازگردانی**: `./deploy/restore.sh 20261001-033000`. اول checksum بررسی و از وضعیت فعلی بک‌آپ ایمنی گرفته می‌شود. web و Celery چند دقیقه متوقف‌اند.
- **تمرین ماهانه‌ی بازگردانی** روی یک سرور آزمایشی: بک‌آپ را کپی کنید، `setup.sh 3–5`، سپس `restore.sh` و smoke.
- **`FIELD_ENCRYPTION_KEY` را جدا نگه دارید.** بدون آن، کلیدهای API ذخیره‌شده در بک‌آپ خوانا نیستند.

## ۷. به‌روزرسانی و برگشت

```bash
./deploy/deploy.sh <sha>       # نسخه‌ی تازه، بدون قطعی (نسخه‌ی قبلی تا سالم شدن تازه دست نمی‌خورد)
./deploy/deploy.sh <sha-قبلی>  # برگشت
```

- migrationها پیش از جابه‌جایی اجرا می‌شوند. برای همین باید با نسخه‌ی قبلی سازگار باشند (ستون تازه nullable، حذف ستون در انتشار بعدی).
- اگر نسخه‌ی تازه سالم نشود، اسکریپت متوقف می‌شود و نسخه‌ی قبلی سر جایش می‌ماند.

## ۸. عیب‌یابی

| نشانه                    | بررسی                                                                          |
| ------------------------ | ------------------------------------------------------------------------------ |
| `web` سالم نمی‌شود       | `docker compose … logs --tail=100 web`. `ALLOWED_HOSTS` شامل `DOMAIN_API` است؟ |
| ۴۰۰ «Bad Request» از API | `ALLOWED_HOSTS` و `CSRF_TRUSTED_ORIGINS`                                       |
| فروشگاه داده ندارد       | `API_INTERNAL_URL` در Vercel و §۴.۴                                            |
| پیامک نمی‌رود            | پنل → داشبورد → سلامت سیستم (اعتبار کاوه‌نگار)، لاگ پیامک‌ها                   |
| گواهی منقضی              | `docker compose … run --rm certbot renew` و `exec nginx nginx -s reload`       |
| رشد دیسک                 | `docker system df`، `deploy/backups/` (نگه‌داری ۱۴ روز)                        |
