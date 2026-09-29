# E-04 — بازطراحی کارت گارانتی و مهلت تست (بریف طراحی)

مجری: کلاد کد، مستقیم در `apps/backend/apps/documents/templates/arbyte/`، ارث‌بری از `arbyte/base.html` (پایه‌ی مشترک E-04 §۰).

| فایل | نقش |
|---|---|
| `templates/arbyte/_warranty_card_body.html` | ساختار کارت (قالب Django، بدون JS) |
| `templates/arbyte/_warranty_card_style.html` | سیستم بصری، `@page` A4 با حاشیه‌ی ۱۲mm، سبک چاپ |
| `templates/arbyte/warranty_card.html` / `warranty_cards_bulk.html` | تک‌کارت (مشتری) / همه‌ی واحدهای سفارش، هر کدام از صفحه‌ی جدید (ادمین) |
| `warranty_card.py` | ساخت context از مدل‌ها |
| `warranty_demo.py` + `manage.py render_warranty_demo` | داده‌ی **DEMO**، جدا از تولید، بدون دیتابیس |

پیش‌نمایش: `docs/design/documents/warranty-demo.pdf` (شش حالت، ۷ صفحه) و `docs/reports/screens/E-04/`.

## ۱. باگ‌های واقعی که پیدا و رفع شد

1. **لوگو و فونت Estedad در هیچ سند آربایتی بار نمی‌شد.** `page.set_content()` سند را روی `about:blank` باز می‌کند و Chromium از آنجا زیرمنبع `file://` بار نمی‌کند. رندر واقعی: `naturalWidth == 0` برای لوگو، `document.fonts` → `error`. در نتیجه همه‌ی PDFها با فونت fallback سیستم و لوگوی شکسته تولید می‌شدند. **رفع:** `pdf.py` حالا لوگو و فونت‌ها را به‌صورت data URI (base64، با cache) inline می‌کند. این رفع روی **همه‌ی** اسناد اثر دارد (فاکتور، برگه‌ی بسته‌بندی، برچسب، گزارش‌های ادمین). تست: `test_assets_are_inlined_as_data_uris`.
2. **QR به فرم خالی می‌رفت.** QR به `track-order?order=…` اشاره می‌کرد، ولی `TrackOrderView.tsx` فقط `?code=` را می‌خواند. حالا `?code=<شماره سفارش>` است و فیلد شماره سفارش از پیش پر می‌شود. تست: `test_qr_points_to_track_order_code_param`.
3. **کارت لبه‌به‌لبه چاپ می‌شد.** `@page { margin: 0 }` در `base.html` بر گزینه‌ی `margin` پلی‌رایت غلبه می‌کند. کارت حالا `@page { size: A4; margin: 12mm }` خودش را دارد.

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
| با اطلاعات ارسال | شرکت حمل / کد رهگیری / تاریخ ارسال (هر کدام اگر پر باشد) |
| در انتظار ارسال | برچسب «در انتظار ارسال» + توضیح اینکه کد رهگیری با پیامک اعلام می‌شود (قالب پیامک E-03 `trackingCode` واقعاً وجود دارد) |
| داده‌ی بلند | نام ۱۲۰ نویسه، ۶ مشخصه، شرایط طولانی: شرایط به صفحه‌ی بعد جاری می‌شود، حاشیه‌ی کارت با `box-decoration-break: clone` در صفحه‌ی دوم بسته می‌ماند، فوتر شکسته نمی‌شود |

ارتفاع اندازه‌گیری‌شده‌ی محتوای پنج حالت اصلی در Chromium: ۲۵۱ تا ۲۷۱mm از ۲۷۲mm مفید، یعنی همه در یک صفحه‌ی A4.

## ۴. تصمیم‌ها و اختلاف‌ها برای مدیر پروژه

- **«روش ارسال» در مدل سفارش وجود ندارد.** `shipping_method` فقط روی `Cart` است و بعد از ثبت سفارش null می‌شود. در `Order` هیچ snapshot‌ای از آن نیست. کارت فعلاً «شرکت حمل» (`Shipment.provider`) را نشان می‌دهد. برای نمایش روش ارسال، `Order.shipping_method_name` (snapshot) لازم است که یک migration است و در این تسک انجام نشد.
- **برچسب اپن‌باکس:** `packages/contracts/src/messages/product.ts` مقدار `openBox: "Open Box"` (انگلیسی) دارد و `PRODUCT_CONDITION_CHOICES` بک‌اند «اپن‌باکس»/«درحدنو» (بدون فاصله). طبق اصلاح ۶ بریف، «اپن باکس» و «در حد نو» استفاده شد. یکسان‌سازی contracts/بک‌اند تسک جداست.
- **`spec_snapshot` هنوز در ثبت سفارش پر نمی‌شود**، پس در عمل «پیکربندی» واریانت نمایش داده می‌شود. قالب آماده‌ی مشخصات کامل است.
- **فاکتور و برگه‌ی بسته‌بندی هم لبه‌به‌لبه چاپ می‌شوند** (همان `@page { margin: 0 }` در `base.html`؛ اندازه‌گیری روی demoهای فعلی: متن از x=0). خارج از دامنه‌ی این تسک، رفع نشد.

## ۵. تأیید

- بک‌اند: **۴۰۴/۴۰۴ سبز** (۵۲ skip، بدون تغییر)، شامل ۱۲ تست جدید `WarrantyCardContentTests`: QR، برچسب وضعیت، ارقام فارسی، پنهان‌شدن گارانتی و شرایط، ارسال/در انتظار، مشخصات، فوتر، نبود DEMO و `<script>` در قالب تولید، data URI، رندر demo بدون رکورد دیتابیس. `ruff check` سبز.
- رندر واقعی Chromium (نه mock) برای demo. PDF بدون جاوااسکریپت ساخته می‌شود.
