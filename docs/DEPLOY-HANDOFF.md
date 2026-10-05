# دستور کار دیپلوی (برای session بعدی که دسترسی سرور دارد)

شاخه‌ی دیپلوی `develop` است. ایمیج‌ها با `build-images.yml` از همین شاخه ساخته می‌شوند و سرور با `deploy/deploy.sh` بالا می‌آید. Vercel به GitHub وصل نیست؛ deploy آن دستی با CLI است.

## پیش‌نیاز session

**متغیرهای محیطی** (از تنظیمات محیط؛ مقدارها هرگز در چت یا لاگ نیایند):

| متغیر          | محتوا                   |
| -------------- | ----------------------- |
| `VPS_HOST`     | آدرس سرور               |
| `VPS_SSH_KEY`  | محتوای کامل فایل `.pem` |
| `VERCEL_TOKEN` | توکن Vercel             |

**شبکه‌ی مجاز:**

- `arbyte.ir`
- `api.arbyte.ir`
- `vercel.com`
- `api.vercel.com`
- آدرس `VPS_HOST`
- پورت ۲۲ (SSH)

## ترتیب (هیچ مرحله‌ای داده‌ی تولید را پاک نمی‌کند)

1. **وضعیت فعلی (فقط خواندن):**
   ```
   ssh root@$VPS_HOST 'cd <checkout> && git log -1 --oneline && docker compose -f docker-compose.prod.yml ps'
   ```
2. **پشتیبان دیتابیس، پیش از هر کاری** (`deploy.sh` پشتیبان نمی‌گیرد):
   - با `pg_dump -Fc` از کانتینر Postgres خروجی بگیرید و در `/root/backups/arbyte-<تاریخ>.dump` روی سرور ذخیره کنید.
   - اندازه‌ی فایل را بررسی کنید.
   - با `pg_restore --list` هم فایل را بخوانید و مطمئن شوید سالم است.
   - **بدون پشتیبان سالم، ادامه ممنوع است.**
3. **بررسی سریال‌های تکراری** (migration `orders.0011` در این حالت متوقف می‌شود):
   - در `manage.py shell`، سریال‌های `OrderItemUnit` را با `Upper` و `Count` گروه کنید.
   - اگر تکراری بود، دیپلوی را نگه دارید و به مالک گزارش دهید.
4. **ساخت ایمیج:** `build-images.yml` را با `workflow_dispatch` روی `develop` اجرا کنید و منتظر سبز شدن بمانید. تگ ایمیج همان SHA کامیت است.
5. **سرور:**

   ```
   ./deploy/deploy.sh <sha>
   ```

   این اسکریپت به ترتیب این‌ها را اجرا می‌کند:
   - `migrate`
   - `collectstatic`
   - کانتینر کاندید و health check
   - smoke test

   فقط این migrationها اجرا می‌شوند:
   - `catalog.0005`
   - `orders.0010` و `orders.0011`
   - `settings.0006` و `settings.0007`
   - `torob.0001`
   - `content.0011`

   همه یا افزودنی‌اند یا داده‌ی موجود را تکمیل می‌کنند؛ هیچ ستون یا جدول موجودی حذف نمی‌شود.

6. **Vercel:** deploy تولیدی همان commit، با Root `apps/web`.
7. **بعد از دیپلوی:**
   - `python manage.py check_homepage_data`: هر «!!» را بررسی و از پنل اصلاح کنید (راهنما: `docs/guides/HOMEPAGE-ADMIN.md`).
   - سوالات متداول: متن اسناد «شرایط»، «گارانتی»، «مرجوعی»، «ارسال» و «حریم خصوصی» را از `GET /api/v1/content/legal` بخوانید. هر سوال در پنل «صفحه‌های محتوا → سوالات متداول» را با همان متن هماهنگ کنید (عددها، مهلت‌ها، شرایط).
   - `python manage.py balepay_webhook set` و بعد `info`.
   - smoke در مرورگر:
     - صفحه‌ی اصلی: هیرو، دسته‌ها، ۴ محصول، FAQ
     - `/products`: فیلتر قیمت
     - `/support`
     - `/legal`
     - پنل ادمین
8. **بازگشت:** اگر smoke شکست خورد، `./deploy/deploy.sh <sha قبلی>` اجرا شود. migrationها برگشت ندارند ولی سازگار با نسخه‌ی قبلی‌اند. دیتابیس فقط با پشتیبان مرحله‌ی ۲ بازگردانده می‌شود.
