# E-04 — بازطراحی کارت گارانتی و مهلت تست (بریف طراحی)

مجری: کلاد کد، مستقیم در `apps/backend/apps/documents/templates/arbyte/`، ارث‌بری از `arbyte/base.html` (پایه‌ی مشترک E-04 §۰).

| فایل | نقش |
|---|---|
| `templates/arbyte/_warranty_card_body.html` | ساختار کارت (قالب Django، بدون JS) |
| `templates/arbyte/_warranty_card_style.html` | سیستم بصری، `@page` A4 با حاشیه‌ی ۱۲mm، سبک چاپ |
| `templates/arbyte/warranty_card.html` / `warranty_cards_bulk.html` | تک‌کارت (مشتری) / همه‌ی واحدهای سفارش، هر کدام از صفحه‌ی جدید (ادمین) |
| `warranty_card.py` | ساخت context از مدل‌ها |
| `warranty_demo.py` + `manage.py render_warranty_demo` | داده‌ی **DEMO**، جدا از تولید، بدون دیتابیس |

پیش‌نمایش: `docs/design/documents/warranty-demo.pdf` (شش حالت، ۷ صفحه، شامل تحویل حضوری) و `docs/reports/screens/E-04/`.

## ۱. باگ‌های واقعی که پیدا و رفع شد

1. **لوگو و فونت Estedad در هیچ سند آربایتی بار نمی‌شد.** `page.set_content()` سند را روی `about:blank` باز می‌کند و Chromium از آنجا زیرمنبع `file://` بار نمی‌کند. رندر واقعی: `naturalWidth == 0` برای لوگو، `document.fonts` → `error`. در نتیجه همه‌ی PDFها با فونت fallback سیستم و لوگوی شکسته تولید می‌شدند. **رفع:** `pdf.py` حالا لوگو و فونت‌ها را به‌صورت data URI (base64، با cache) inline می‌کند. این رفع روی **همه‌ی** اسناد اثر دارد (فاکتور، برگه‌ی بسته‌بندی، برچسب، گزارش‌های ادمین). تست: `test_assets_are_inlined_as_data_uris`.
2. **QR به فرم خالی می‌رفت.** QR به `track-order?order=…` اشاره می‌کرد، ولی `TrackOrderView.tsx` فقط `?code=` را می‌خواند. حالا `?code=<شماره سفارش>` است و فیلد شماره سفارش از پیش پر می‌شود. تست: `test_qr_points_to_track_order_code_param`.
3. **همه‌ی اسناد آربایت لبه‌به‌لبه چاپ می‌شدند.** `@page { margin: 0 }` در `arbyte/base.html` در Chromium بر آرگومان `margin` تابع `render_pdf` غلبه می‌کرد: فاکتور، برگه‌ی بسته‌بندی، برچسب و لیست روزانه متن را از x=0 شروع می‌کردند. فوتر صفحه‌شمار فاکتور و لیست روزانه هم که داخل حاشیه‌ی پایین رسم می‌شود جایی برای نمایش نداشت. **رفع:** آن قاعده حذف شد. حاشیه‌ی هر سند حالا همان مقداری است که کدش می‌خواهد (فاکتور ۱۲mm، بسته‌بندی ۱۰mm، برچسب ۵mm، کارت گارانتی ۱۲mm).
4. **روش ارسال روی سفارش ذخیره نمی‌شد.** `Cart.shipping_method` بعد از ثبت سفارش خالی می‌شود و `Order` فیلدی برای آن نداشت. روش ارسال با شرکت حمل یکی نیست: روش‌های فعلی «پست پیشتاز»، «ارسال فوری تهران» و «تحویل حضوری» هستند. برای «تحویل حضوری» اصلاً مرسوله‌ای ساخته نمی‌شود، پس کارت برای همیشه «در انتظار ارسال» نشان می‌داد. **رفع:** فیلد `Order.shipping_method_name` (snapshot، migration `orders.0007`، الحاقیه‌ی Django مثل `paid_at`) در چک‌اوت پر می‌شود. کارت «روش ارسال» را نشان می‌دهد، و سفارش تحویل‌شده بدون مرسوله دیگر «در انتظار ارسال» نمی‌گیرد. سفارش‌های قدیمی مقدار خالی دارند و ردیف پنهان می‌شود.
5. **`variant_name_snapshot` به‌جای نام واریانت، SKU را ذخیره می‌کرد.** همه‌ی مصرف‌کننده‌ها (فاکتور، برگه‌ی بسته‌بندی، `variantLabel` در API، کارت گارانتی) آن را برچسب واریانت می‌خوانند. حالا `ProductVariant.name` ذخیره می‌شود. SKU همچنان در `sku_snapshot` است.

## ۲. جدول نگاشت متغیرها (بریف ← قالب ← مدل)

| فیلد بریف | متغیر قالب | منبع |
|---|---|---|
| شناسه کارت | `card.certificate_id` | `OrderItemUnit.certificate_id` |
| شماره سفارش | `card.order_number` | `Order.order_number` |
| تاریخ صدور | `card.issue_date` | زمان رندر، شمسی |
| نام مشتری | `card.customer_name` | `Order.shipping_recipient_name` |
| شماره تماس | `card.customer_phone` | `Order.shipping_mobile` (ارقام فارسی) |
| نام محصول | `card.product_name` | `OrderItem.product_name_snapshot` |
| برند | `card.product_brand` | `Product.brand.name` |
| مدل | `card.product_model` | `Product.model_number` |
| وضعیت کالا | `card.product_condition` | `Product.condition` → `CONDITION_LABELS` (آکبند / اپن باکس / استوک / در حد نو) |
| شماره سریال | `card.serial_number` | `OrderItemUnit.serial_number` (LTR) |
| مشخصات کلیدی | `card.key_specs` | `OrderItem.spec_snapshot` (dict یا لیست {label,value}، حداکثر ۶)، وگرنه `variant_name_snapshot` |
| تاریخ خرید | `card.purchase_date` | `Order.paid_at` یا `created_at` |
| مدت / شروع / پایان مهلت تست | `card.test_period_days_fa`، `card.test_period.start_label/end_label` | `SiteSettings.test_period_days` از `Order.delivered_at` |
| گارانتی (مدت، ارائه‌دهنده، شروع، پایان) | `card.has_warranty`، `card.warranty_months_fa`، `card.warranty_provider`، `card.warranty.*` | `Product.warranty_months` / `warranty_provider` از `Order.delivered_at` |
| روش ارسال | `card.shipping_method` | `Order.shipping_method_name` (snapshot چک‌اوت) |
| شرکت حمل | `card.carrier_name` | `Shipment.provider` |
| کد رهگیری | `card.tracking_number` | `Shipment.tracking_number` |
| تاریخ ارسال | `card.shipped_date` | `Shipment.shipped_at` یا `Order.shipped_at` |
| شرایط | `card.terms` | فقط `SiteSettings.warranty_terms` (خالی یا فقط فاصله = بخش پنهان) |
| QR | `card.qr_svg` | `https://arbyte.ir/track-order?code=<order_number>`، SVG سمت سرور |
| فوتر | `logo_mono_uri`، `seller_phone`، `seller_address` | `SiteSettings.phone_display` / `address` |

## ۳. حالت‌ها

| حالت | رفتار |
|---|---|
| فقط مهلت تست / بدون گارانتی | کارت گارانتی کلاً حذف، مهلت تست تمام‌عرض |
| گارانتی + مهلت تست | دو کارت کنار هم با تأکید روی تاریخ پایان |
| قبل از تحویل | «از تاریخ تحویل» + یک خط توضیح که شمارش از روز تحویل است |
| با اطلاعات ارسال | روش ارسال / شرکت حمل / کد رهگیری / تاریخ ارسال (هر کدام اگر پر باشد) |
| تحویل‌شده بدون مرسوله (تحویل حضوری) | فقط روش ارسال، بدون برچسب «در انتظار ارسال» |
| در انتظار ارسال | برچسب «در انتظار ارسال» + توضیح اینکه کد رهگیری با پیامک اعلام می‌شود (قالب پیامک E-03 `trackingCode` واقعاً وجود دارد) |
| داده‌ی بلند | نام ۱۲۰ نویسه، ۶ مشخصه، شرایط طولانی: شرایط به صفحه‌ی بعد جاری می‌شود، حاشیه‌ی کارت با `box-decoration-break: clone` در صفحه‌ی دوم بسته می‌ماند، فوتر شکسته نمی‌شود |

ارتفاع اندازه‌گیری‌شده‌ی محتوای پنج حالت اصلی در Chromium: ۲۴۰ تا ۲۶۹mm از ۲۷۲mm مفید، یعنی همه در یک صفحه‌ی A4.

## ۴. تصمیم‌ها و اختلاف‌ها برای مدیر پروژه

- **`Order.shipping_method_name` فقط در Django است، نه در Prisma** (همان الگوی `paid_at`/`invoice_pdf`/`admin_notified_at`). اگر Nest هم روزی سفارش بسازد، باید همین فیلد را اضافه کند.
- **برچسب اپن‌باکس:** `packages/contracts/src/messages/product.ts` مقدار `openBox: "Open Box"` (انگلیسی) دارد و `PRODUCT_CONDITION_CHOICES` بک‌اند «اپن‌باکس»/«درحدنو» (بدون فاصله). طبق اصلاح ۶ بریف، «اپن باکس» و «در حد نو» استفاده شد. یکسان‌سازی contracts/بک‌اند تسک جداست.
- **`spec_snapshot` هنوز در ثبت سفارش پر نمی‌شود**، پس در عمل «پیکربندی» واریانت (نام واریانت، اگر تعریف شده باشد) نمایش داده می‌شود. قالب آماده‌ی مشخصات کامل است.
- **سفارش‌های قبلی** که `variant_name_snapshot` آن‌ها SKU است عوض نشدند (snapshot تاریخی دست نمی‌خورد).

## ۵. تأیید

- بک‌اند: **۴۰۸/۴۰۸ سبز** (۵۲ skip، بدون تغییر). تست‌های جدید: ۱۵ تست `WarrantyCardContentTests` (QR، برچسب وضعیت، ارقام فارسی، پنهان‌شدن گارانتی و شرایط، ارسال/در انتظار/تحویل حضوری، روش ارسال، مشخصات، فوتر، نبود DEMO و `<script>` در قالب تولید، data URI، رندر demo بدون رکورد دیتابیس) و `test_order_snapshots_shipping_method_name_and_variant_name` (چک‌اوت واقعی؛ روش ارسال بعد از حذف ShippingMethod روی سفارش می‌ماند). `ruff` روی فایل‌های تغییرکرده سبز است. دو خطای `ruff` از قبل در `public_api/account_views.py` و `tests_e05_customer_journey.py` (E-05) مانده‌اند که این تغییر به آن‌ها دست نزده.
- رندر واقعی Chromium (نه mock) برای demo کارت، و برای فاکتور ۱ و ۱۵ قلمی، برگه‌ی بسته‌بندی ۱ و ۱۵ قلمی، برچسب و لیست روزانه بعد از رفع حاشیه: متن فاکتور/لیست از ۳۴pt (۱۲mm) شروع می‌شود، بسته‌بندی از ۲۸pt (۱۰mm)؛ برچسب همچنان یک صفحه؛ فوتر «صفحه ۱ از ۲» فاکتور حالا دیده می‌شود. PDFهای demo قبلی فاکتور/بسته‌بندی/برچسب در `docs/design/documents/` هنوز نسخه‌ی قبل از رفع هستند (بازسازی‌شان به داده‌ی DEMO در دیتابیس نیاز دارد).
