# گزارش نهایی آدیت (§۲۳)

شش جلسه به ترتیب ۱، ۶، ۲، ۳، ۴، ۵ انجام شد و هر جلسه یک کامیت و یک گزارش دارد (`AUDIT-1..6.md`). جزئیات هر بند در گزارش همان جلسه است و این‌جا فقط خلاصه آمده. هیچ مقدار محرمانه‌ای در این گزارش نیست.

## ۱–۳. فایل‌ها و migrationها

- **دامنه‌ی تغییر:** حدود ۱۵۰ فایل کد، به‌اضافه‌ی حذف ۴۴۰ فریم WebP هیرو. فهرست دقیق: `git diff --stat 28a1b90 HEAD`.
- **فایل‌های تازه‌ی اصلی:**
  - بک‌اند:
    - `apps/orders/{payment_state,fulfilment,testing}.py`
    - `apps/orders/balepay/{client,config,service,views}.py`
    - دستور `balepay_webhook`
    - اپ `apps/torob/`
    - `apps/admin_api/balepay_admin.py`
    - `apps/catalog/key_specs.py`
    - `apps/public_api/media.py`
    - دستور `check_homepage_data`
  - فرانت:
    - `components/order/OrderPaymentPanel.tsx`
    - `lib/{urls,upstream-fetch,seo}.ts`
    - پنل: `BalePayPage` و `TorobPage`
    - فونت `public/fonts/inter/`
    - رسانه‌ی هیرو: `public/hero/*.mp4|webm|avif`
- **Migrationها** (همه روی داده‌ی موجود امن‌اند):

  | Migration                       | جلسه | محتوا                                                     |
  | ------------------------------- | ---- | --------------------------------------------------------- |
  | `settings.0006`                 | ۶    | choices سرویس                                             |
  | `torob.0001`                    | ۶    | لاگ fetch                                                 |
  | `orders.0010` و `settings.0007` | ۲    | پرداخت سه‌روشی، `BalePaySession`، `BaleUpdate`، سقف ریالی |
  | `catalog.0005`                  | ۵    | `key_spec_order`                                          |
  | `orders.0011`                   | ۵    | قید یکتای سریال و ساخت واحدهای جاافتاده                   |

  `orders.0011` اگر سریال تکراری پیدا کند، **با پیام روشن متوقف می‌شود**. در آن صورت اول سریال‌ها را در پنل اصلاح کنید.

## ۴–۸. پرداخت

- **۴. معماری بله‌پی:**
  1. چک‌اوت یک `BalePaySession` با توکن یک‌بارمصرف می‌سازد و لینک `ble.ir/<bot>?start=<token>` را برمی‌گرداند.
  2. ربات فاکتور ریالی را با مبلغی می‌فرستد که سرور حساب کرده.
  3. PreCheckout فقط اعتبارسنجی است و پرداخت را ثبت نمی‌کند.
  4. SuccessfulPayment با payload، مبلغ و جلسه تطبیق داده می‌شود. `provider_payment_charge_id` یکتاست.
  5. وب‌هوک روی مسیر مخفی است، با ضد تکرار `update_id`.
- **۵. پیکربندی بله‌پی در پنل:** بخش «بله پی» با دسترسی کلیدهای API:
  - فعال/آزمایشی، نام ربات، سقف به ریال.
  - توکن‌ها رمزشده‌اند و فقط چهار نویسه‌ی آخر نمایش داده می‌شود.
  - آزمون اتصال، ثبت وب‌هوک، فهرست جلسه‌ها.
- **۶. ماشین وضعیت پرداخت:**
  - سه روش: `ONLINE`، `BANK_TRANSFER`، `COMBINED`.
  - `reconcile_order_payments` تنها منبع وضعیت سفارش است.
  - سهم آنلاین برابر min(کل، سقف) است. باقی‌مانده با واریز پرداخت می‌شود و اگر پرداخت آنلاین شکست بخورد، به واریز منتقل می‌شود.
- **۷. ترکیب پرداخت:** در پنل، کارت «پرداخت» این‌ها را نشان می‌دهد: کل، آنلاین، واریز، پرداخت‌شده، باقی‌مانده، و برای هر سهم وضعیت، charge id و رسید. مشتری هم همین را در صفحه‌ی سفارش می‌بیند.
- **۸. باگ رسید:**
  - رسید بعد از ارسال ناپدید می‌شد و ادمین آن را نمی‌دید. حالا فایل خصوصی است و فقط مالک سفارش و ادمین به آن دسترسی دارند.
  - مبلغ رسید همان سهم واریز است، نه کل سفارش.

## ۹–۱۱. کارایی و باگ‌ها

- **۹. هیرو** (Fast-4G، قبل → بعد):

  |                         | موبایل          | دسکتاپ          |
  | ----------------------- | --------------- | --------------- |
  | دانلود در ۸ ثانیه‌ی اول | 3.5MB → 2.0MB   | 11.5MB → 3.3MB  |
  | دیده‌شدن هیرو           | ۸٫۸ → ۱٫۷ ثانیه | ۳٫۸ → ۰٫۷ ثانیه |

  ۲۲۰ فریم با یک پوستر AVIF و یک ویدیوی lazy (H.264 با جایگزین VP9) جایگزین شد. سه باگ کادربندی هم رفع شد.

- **۱۰. تصاویر دسته‌ها:** حالا ۰٫۳ ثانیه بعد از اسکرول کامل می‌شوند؛ قبلاً روی دسکتاپ در ۶۰ ثانیه هم نمی‌رسیدند. دانلود دوباره‌ی هر تصویر هم حذف شد.
- **۱۱. باگ‌های آدیت که رفع شدند:**
  - پیش‌نمایش دامنه (Worker پروژه‌ی ERP).
  - رسید.
  - ۵۰۰ در جستجو با برند null، واریانت خالی و تصویر null.
  - نرمال‌سازی URL.
  - timeout در BFF.
  - تایپوگرافی لاتین و اندازه‌ی فونت دسکتاپ.
  - مشخصات کلیدی.
  - صفحه‌بندی در DB.
  - دامنه‌ی مگامنو.
  - منبع ساعت پشتیبانی.
  - اتمیک بودن سریال، ارسال و واحد.
  - ۴۰۴ به‌جای ۵۰۰ در پنل.
  - معیار Flagship Duel.

## ۱۲–۱۴. تست و build

- **۱۲. تست‌های تازه:**
  - بک‌اند:
    - `tests_audit1_null_safety`
    - `test_receipts_audit1`
    - `tests_audit2_payments`
    - `test_balepay_admin`
    - `torob/tests`
    - `tests_audit5_catalog`
    - `test_audit5_fulfilment`
    - `test_audit5_security` (پیمایش خودکار همه‌ی مسیرهای پنل)
  - وب:
    - `urls`
    - `upstream-fetch`
    - `hero-engine`
    - `support-hours`
  - قراردادها: `payment-plans`
- **۱۳. نتیجه:** بک‌اند ۵۳۱ ✅، وب ۱۰۹ ✅، قراردادها ۸۷ ✅. ruff، eslint و tsc بدون خطا.
- **۱۴. Build:** `next build` و `vite build` (پنل) سبز.

## ۱۵. باقی‌مانده‌ها (کار مالک)

- **Cloudflare:** Custom Domain مربوط به Worker پروژه‌ی `erp-milad` را از `arbyte.ir` و `www` بردارید. بعد پیش‌نمایش تلگرام را با @WebpageBot تازه کنید (`AUDIT-1`).
- **ترب:** کلید عمومی ترب (Q-48) و ثبت آدرس v3 در پنل ترب.
- **بله:** یک پرداخت واقعی کوچک برای تأیید واحد ریال (Q-52). اجرای `balepay_webhook set` و سپس `info` روی سرور.
- **Vercel:** ناحیه‌ی fra1 (Q-47).
- **§۱۴ روی تولید:** بعد از deploy، `check_homepage_data` را اجرا کنید؛ این محیط به تولید دسترسی نداشت.

## ۱۶. متغیرهای محیطی

- **متغیر تازه‌ای اضافه نشد.** محرمانه‌های بله و ترب در دیتابیس و رمزشده هستند (`ApiCredential`)، نه env.
- **VPS:** `SECRET_KEY`، `JWT_SIGNING_KEY`، `FIELD_ENCRYPTION_KEY`، `DATABASE_URL`، `REDIS_URL`، `ALLOWED_HOSTS`، `CORS_ALLOWED_ORIGINS`، `CSRF_TRUSTED_ORIGINS`، `BACKEND_BASE_URL`، `FRONTEND_BASE_URL`، `STOREFRONT_URL`، `BFF_SHARED_SECRET`، `REVALIDATE_SECRET`، `KAVENEGAR_API_KEY`، `PRIVATE_MEDIA_ROOT`، `DJANGO_ADMIN_URL`.
- **Vercel:** `NEXT_PUBLIC_APP_URL`، `NEXT_PUBLIC_API_BASE_URL`، `API_INTERNAL_URL`، `REVALIDATE_SECRET`، `BFF_SHARED_SECRET`. جدول کامل در `docs/DEPLOY.md` است.

## ۱۷–۱۸. Migration و deploy

1. **پشتیبان:** پیش از deploy از دیتابیس پشتیبان بگیرید. `deploy.sh` این کار را نمی‌کند و migrationهای این شاخه داده می‌نویسند.
2. **VPS:** دستور `./deploy/deploy.sh <sha>` همه‌ی این‌ها را انجام می‌دهد:
   - `migrate` (معادل `python manage.py migrate`)
   - `collectstatic`
   - کانتینر کاندید و health check
   - smoke test
3. **Vercel:** deploy تولیدی از همین commit. Root Directory را `apps/web` بگذارید.
4. **بعد از deploy:**
   - `python manage.py check_homepage_data --strict`
   - `python manage.py balepay_webhook set` و بعد `info`
   - تازه‌کردن پیش‌نمایش تلگرام
