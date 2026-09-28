# گزارش بچ ۰۲

## وضعیت

| تسک  | وضعیت              | کامیت          | یک خط                                                                                                 |
| ---- | ------------------ | -------------- | ----------------------------------------------------------------------------------------------------- |
| D-01 | ⚠️ کامل با پیش‌فرض | `e19dc85`      | بک‌اند Django وایب‌شاپ به مونوریپو (`apps/backend`)، برندزدایی، venv/اسکریپت‌های مستقل                |
| D-02 | ✅ کامل            | `4f06ef6`      | مدل‌های کاتالوگ/موجودی/محتوا از تک‌قیمتی وایب به واریانت‌محور آربایت، seed برابر با Nest              |
| D-03 | ✅ کامل            | `0e92822`      | ۹ اندپوینت عمومی روی قرارداد آربایت در Django، صفر اختلاف با Nest (`contract:parity`)، فرانت سوییچ شد |
| D-04 | ✅ کامل            | `248a81f`      | ورود/حساب/سبد مهمان-یا-کاربر سمت سرور روی واریانت                                                     |
| D-05 | ⚠️ کامل با پیش‌فرض | _(همین کامیت)_ | سفارش (۹ وضعیت)، پرداخت (کارت‌به‌کارت + اسکلت بله‌پی)، کوپن، ارسال، مرجوعی قلم‌به‌قلم                 |

## همه‌ی انحراف‌های عمدی از سند

Q-17 (پایتون ۳.۱۴ به‌جای ۳.۱۲) — D-01
Q-18 (آلودگی `SpecificationDefinition` دیتابیس dev — فیلتر در export، نه حذف) — D-02
Q-19 (قالب شماره سفارش `ARB-`+۸رقم)، Q-20 (حساب کارت‌به‌کارت خالی=غیرفعال)، Q-21 (سه روش ارسال seed از `Cart.dc.html`)، Q-22 (نوع فاکتور شخصی/حقوقی به مدل اضافه نشد — تعارض §۱/§۲ سند D-05)، Q-23 (رسید بدون presigned URL واقعی، MinIO سیم‌کشی نشده) — D-05

D-03/D-04 انحراف مستقل‌ثبت‌شده‌ای در `QUESTIONS.md` نداشتند (تصمیم‌های پیاده‌سازی‌شان مستقیم در خودِ گزارش‌شان مستند است، نه به‌عنوان سؤال باز برای مدیر پروژه). جزئیات کامل هر Q در `docs/QUESTIONS.md`.

## تصمیم‌های مدیر پروژه

**Q-17** · پایتون ۳.۱۲ روی ماشین dev نبود.
پیش‌فرض اعمال‌شده: venv با ۳.۱۴ ساخته شد؛ همه‌ی وابستگی‌ها wheel داشتند، ۱۹۴ تست + ruff سبز.
کجا عوض می‌شود: اگر دیپلوی به دقیقاً ۳.۱۲ نیاز دارد (`Dockerfile` صریح `python:3.12-slim-bookworm` دارد)، venv dev را با ۳.۱۲ از نو بسازید — کد وابستگی به ویژگی ۳.۱۴-فقط ندارد.

**Q-18** · ۵۱ از ۱۰۴ ردیف `SpecificationDefinition` در دیتابیس dev آلوده‌اند (باقی‌مانده‌ی تست دستی/یتیم).
پیش‌فرض اعمال‌شده: `export-catalog.ts` فقط مشخصه‌های واقعاً استفاده‌شده را صادر می‌کند؛ دیتابیس dev دست‌نخورده ماند.
کجا عوض می‌شود: حذف مستقیم ۵۱ ردیف + `ProductSpecification`های یتیم‌شان از دیتابیس dev — ایمن، هیچ محصول واقعی وصل نیست.

**Q-19** · قالب شماره‌ی سفارش نیاز به تأیید داشت.
پیش‌فرض اعمال‌شده: دقیقاً طبق متن سند — `ARB-` + ۸ رقم تصادفی.
کجا عوض می‌شود: فقط `generate_order_number()` (`apps/orders/models.py`).

**Q-20** · حساب کارت‌به‌کارت واقعی نباید commit شود.
پیش‌فرض اعمال‌شده: سه فیلد `SiteSettings` خالی ماندند — خالی بودن یعنی روش در چک‌اوت غیرفعال است.
کجا عوض می‌شود: نام صاحب حساب/شماره کارت/شبا واقعی را مدیر پروژه در رابط تنظیمات ادمین (یا مستقیم دیتابیس prod) بدهد.

**Q-21** · هزینه/نام واقعی روش‌های ارسال معلوم نبود.
پیش‌فرض اعمال‌شده: seed dev دقیقاً سه روش `Cart.dc.html` (پست پیشتاز رایگان، ارسال فوری تهران ۴۵۰هزار/رایگان بالای ۵۰میلیون، تحویل حضوری رایگان).
کجا عوض می‌شود: در رابط ادمین `ShippingMethod` (بچ ۰۴) یا دیتابیس prod.

**Q-22** · «نوع فاکتور» جزو ورودی سفارش خواسته شده بود، اما مدل Prisma فیلدش را ندارد.
پیش‌فرض اعمال‌شده: مدل/قرارداد Prisma-محور برنده شد — فیلد فاکتور اصلاً اضافه نشد.
کجا عوض می‌شود: اول تصمیم مدل‌سازی در `apps/api/prisma/schema/05-order.prisma`، بعد مهاجرت Django + `CreateOrderBodySchema`.

**Q-23** · «لینک امضاشده» رسید خواسته شده بود؛ این ریپو MinIO/S3 سیم‌کشی ندارد.
پیش‌فرض اعمال‌شده: فایل در مسیر private غیرعمومی + endpoint احراز‌هویت‌شده‌ی استریم — همان اثر، بدون presigned URL واقعی.
کجا عوض می‌شود: وقتی `django-storages`/`boto3` سیم‌کشی شد (تسک زیرساختی جدا)، `get_file_url()` می‌تواند presigned URL واقعی برگرداند.

## وضعیت Nest

`apps/api` (NestJS) هنوز در ریپو است، کد حذف نشده، تست‌هایش (۸۹ تست) هنوز سبز و در `pnpm test`/`pnpm typecheck`/`pnpm lint` مونوریپو اجرا می‌شوند.

- **`apps/web` (فروشگاه) کاملاً از Nest جدا شده** — از D-03 به بعد `NEXT_PUBLIC_API_BASE_URL`/`API_INTERNAL_URL` هر دو به Django (`:8000`) اشاره می‌کنند. هیچ صفحه‌ی storefront دیگر به Nest فراخوانی نمی‌زند.
- **`apps/admin` (پنل ادمین) هنوز کاملاً روی Nest است** — `apps/admin/.env`'س `API_INTERNAL_URL=http://localhost:4000` دست‌نخورده مانده. صفحات ادمین ساخته‌شده در T-101 (دسته‌بندی/برند/مشخصات) هنوز Nest's `apps/api` را صدا می‌زنند، نه Django's `apps/admin_api` (که D-01 وایب‌شاپ با ۹۰+ اندپوینت آماده وارد کرد و در D-02 تا D-05 مرحله‌به‌مرحله روی مدل جدید به‌روز شد، ولی هنوز هیچ صفحه‌ی فرانتی به آن وصل نیست).
- یعنی الان دو بک‌اند ادمین معتبر و مستقل وجود دارد: Nest's `apps/api` (فقط دسته‌بندی/برند/مشخصات، T-101، بدون سفارش/پرداخت/موجودی) و Django's `apps/admin_api` (کامل‌تر — سفارش/پرداخت/کوپن/موجودی/گزارش/کاربر/نقش، از وایب‌شاپ + این بچ). سوییچ `apps/admin` از Nest به Django's `apps/admin_api` و کنارگذاشتن نهایی Nest، صریحاً کار بچ ۰۴ است (طبق D-05.md §۶: «رابط ادمین بچ ۰۴»).

## تغییرات قرارداد (Zod)

- `permissions-map.ts`: مقدار جدید `EndpointAccess` — `"guest-or-authenticated"` (D-04، مسیرهای سبد). `POST /account/wishlist/merge` اضافه شد (D-04). `POST /orders/track` (public)، `GET /orders/:orderNumber/invoice.pdf`/`POST /orders/:orderNumber/return` (authenticated)، `GET /admin/payments/receipts/:id/file` (`payments.view`) اضافه شدند (D-05).
- `cart/index.ts`: `CartSchema.subtotal` از `MoneyAmountSchema` (مثبت) به `z.number().int().nonnegative()` تغییر کرد — سبد خالی جمع صفر دارد (D-04، باگ واقعی که `contract:test` پیدا کرد).
- `account/index.ts`: `MergeWishlistItemSchema`/`MergeWishlistBodySchema` جدید — `POST /account/wishlist/merge` (D-04).
- `common/error-codes.ts`: پنج کد جدید — `COUPON_INVALID`/`COUPON_MIN_ORDER_NOT_MET`/`COUPON_USAGE_LIMIT_REACHED`/`RETURN_NOT_ELIGIBLE`/`RETURN_WINDOW_EXPIRED` (D-05).
- `common/rate-limits.ts`: `orderTrackPerIp` (۱۰/ساعت) اضافه شد (D-05).
- `order/index.ts`: `CreateOrderBodySchema` با `shippingMethodId?`/`couponCode?` گسترش یافت؛ `TrackOrderBodySchema`/`TrackOrderResponseSchema`، `CreateReturnRequestBodySchema`/`ReturnRequestSchema` جدید (D-05).
- `packages/contracts/test-vectors/*.json` (D-03) — بردار تست مشترک TS↔Django، نه تغییر schema؛ برای کامل بودن ذکر شد.

## اندپوینت‌های ادمین خاموش

از `docs/backend/ADMIN-DISABLED.md` (D-02) — پنج فایل Django admin_api که با مدل واریانت‌محور جدید جور نبودند، از `urls.py` برداشته شدند (کد حذف نشده): `products.py`، `pricing.py`، `specs.py`، `inventory.py`، `homepage.py`. مسیرهای حذف‌شده: `admin/homepage/hero/`، `admin/homepage/showcases/*`، `admin/homepage/community-tiles/*`، `admin/products/*`، `admin/products/prices/*`، `admin/attributes/*`، `admin/products/<id>/specs/`، `admin/inventory/*`، `admin/stock-movements/*`. تست‌هایشان `@skip` نشانه‌گذاری شدند، منطق تستی حذف نشده. بازسازی روی `ProductVariant`/`Inventory`/`SpecificationDefinition`/`HomepageBlock` کار `D-08` (بچ ۰۴، ویرایشگر واریانت در صفحه‌ی محصول) است — این بچ (D-01 تا D-05) هیچ‌کدام را تغییر نداد یا اضافه نکرد.

## فایل‌ها/تصمیم‌هایی که مدیر پروژه باید بدهد

- تصمیم درباره‌ی ۵۱ ردیف آلوده‌ی `SpecificationDefinition` در دیتابیس dev — حذف یا نگه‌داشتن (Q-18).
- نام صاحب حساب/شماره کارت/شبای واقعی برای کارت‌به‌کارت prod (Q-20) — بدون آن، روش کارت‌به‌کارت در prod هم غیرفعال می‌ماند.
- هزینه/نام واقعی روش‌های ارسال (Q-21) — سه مقدار فعلی فقط برای dev/دمو هستند.
- تصمیم مدل‌سازی نوع فاکتور شخصی/حقوقی (Q-22) — قبل از اینکه Checkout بچ ۰۳ بتواند آن را واقعاً بفرستد.
- تأیید قالب شماره سفارش `ARB-`+۸رقم (Q-19) — اگر فرمت دیگری مدنظر است، تغییرش ارزان است (یک تابع) ولی هرچه زودتر بهتر (شماره‌های واقعی prod بعداً قابل تغییر نیستند).

## اعداد

- `apps/backend`: `manage.py test` **۳۱۸ تست (۲۶۶ اجرا، ۵۲ skip تجمعی از D-01/D-02)، همه OK**؛ `ruff check .` سبز — روی کل تاریخچه‌ی بچ (D-01: ۱۹۴→D-02: ۲۱۵→D-03: ۲۴۲→D-04: ۲۹۰→D-05: ۳۱۸)، صفر رگرسیون در هیچ مرحله.
- مونوریپو TS: `pnpm typecheck` ۵/۵، `pnpm lint` ۴/۴، `pnpm test` ۵/۵ (contracts ۸۵، ui ۵۲، api ۸۹، admin ۲، web ۸۵ — بدون تغییر از پایان D-04، چون D-05 فقط `packages/contracts` و `apps/backend` را لمس کرد).
- `pnpm contract:test`: **۴۴/۴۴** (کاتالوگ D-03: ۱۵، auth/account/cart D-04: ۱۶، orders/payments D-05: ۱۳).
- `pnpm contract:parity` (D-03، Nest vs Django روی همان seed): صفر اختلاف در ۱۲ اندپوینت.
- `pnpm --filter @arbyte/web test:e2e`: ۲/۲ سبز روی Django (D-03).

## ریسک‌ها و بدهی فنی

- **`apps/admin` هنوز کاملاً روی Nest است** (بخش «وضعیت Nest» بالا) — بچ ۰۴ باید سوییچ کند، شبیه کاری که D-03 برای `apps/web` کرد؛ تا آن زمان دو بک‌اند ادمین موازی و مستقل زنده‌اند.
- **پنج فایل admin_api خاموش** (`docs/backend/ADMIN-DISABLED.md`) — تا `D-08` هیچ رابط ادمینی برای محصول/قیمت/مشخصات/موجودی/صفحه‌اصلی وجود ندارد؛ این عملیات فعلاً فقط از طریق Django admin پنل قابل‌انجام‌اند (نه رابط سفارشی).
- **`GET /shipping-methods` عمومی وجود ندارد** (D-05) — `POST /orders` بدون آن روی ارزان‌ترین روش فعال fallback می‌کند؛ Checkout بچ ۰۳ برای انتخاب واقعی کاربر به این endpoint نیاز دارد.
- **MinIO سیم‌کشی نشده** (Q-23) — نه فقط رسید پرداخت؛ هر آپلود آینده‌ای که نیاز به presigned URL واقعی دارد به همین محدودیت برمی‌خورد تا یک تسک زیرساختی جدا آن را حل کند.
- **`ORDER_AUTO_CANCEL_AFTER_HOURS`/نرخ‌های throttle پیش‌فرض هستند، نه عدد نهایی تأییدشده** — قابل‌تنظیم از env، ولی مقدار فعلی (۲۴ ساعت) حدس معقول سند تسک است، نه تصمیم رسمی.
- `/cart`، `/checkout`، `/track-order`، `/account` هنوز صفحه ندارند (بچ ۰۳) — بک‌اند کامل هر چهار از D-04/D-05 آماده است.
