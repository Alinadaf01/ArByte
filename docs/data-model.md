# مدل داده — آربایت

> خودکار ساخته شده با `python manage.py generate_data_model` (apps/backend)؛ دستی ویرایش نکنید.
> منبع حقیقت: مدل‌های Django در `apps/backend/apps/*/models.py`. نمودار روابط: [erd.md](./erd.md).

## users

### Address

جدول `users_address`

| فیلد             | نوع            | ویژگی |
| ---------------- | -------------- | ----- |
| `id`             | BigAutoField   | PK    |
| `user`           | FK → User      |       |
| `title`          | CharField(50)  |       |
| `province`       | CharField(100) |       |
| `city`           | CharField(100) |       |
| `line`           | TextField      |       |
| `postal_code`    | CharField(10)  |       |
| `receiver_name`  | CharField(150) |       |
| `receiver_phone` | CharField(11)  |       |
| `is_default`     | BooleanField   |       |
| `created_at`     | DateTimeField  |       |

### ImpersonationTicket

جدول `users_impersonationticket` — §7.6-۲ (redesigned) — the admin panel never receives a real JWT for the impersonated session directly; it gets one of these, single-use and 60-seconds-lived. The storefront's /impersonate route is the only thing that ever exchanges it for a real (restricted) access token, via POST — so the powerful credential itself never sits in a URL, browser history, server access log, or Referer header. A leaked ticket is worthless within a moment, which is the whole point.

| فیلد          | نوع           | ویژگی  |
| ------------- | ------------- | ------ |
| `id`          | BigAutoField  | PK     |
| `token`       | CharField(64) | unique |
| `target_user` | FK → User     |        |
| `issued_by`   | FK → User     | null   |
| `created_at`  | DateTimeField |        |
| `expires_at`  | DateTimeField |        |
| `used_at`     | DateTimeField | null   |

### OTPCode

جدول `users_otpcode`

| فیلد         | نوع                       | ویژگی |
| ------------ | ------------------------- | ----- |
| `id`         | BigAutoField              | PK    |
| `phone`      | CharField(11)             |       |
| `code_hash`  | CharField(128)            |       |
| `attempts`   | PositiveSmallIntegerField |       |
| `used_at`    | DateTimeField             | null  |
| `created_at` | DateTimeField             |       |
| `expires_at` | DateTimeField             |       |

### User

جدول `users_user` — Staff can create a user directly with is_verified=True, bypassing OTP.

| فیلد                   | نوع              | ویژگی  |
| ---------------------- | ---------------- | ------ |
| `id`                   | BigAutoField     | PK     |
| `password`             | CharField(128)   |        |
| `last_login`           | DateTimeField    | null   |
| `is_superuser`         | BooleanField     |        |
| `phone`                | CharField(11)    | unique |
| `first_name`           | CharField(150)   |        |
| `last_name`            | CharField(150)   |        |
| `email`                | CharField(254)   | null   |
| `is_verified`          | BooleanField     |        |
| `is_active`            | BooleanField     |        |
| `is_staff`             | BooleanField     |        |
| `created_at`           | DateTimeField    |        |
| `last_dashboard_visit` | DateTimeField    | null   |
| `must_change_password` | BooleanField     |        |
| `groups`               | M2M → Group      |        |
| `user_permissions`     | M2M → Permission |        |

## catalog

### Brand

جدول `catalog_brand`

| فیلد          | نوع            | ویژگی  |
| ------------- | -------------- | ------ |
| `id`          | BigAutoField   | PK     |
| `name`        | CharField(150) | unique |
| `slug`        | SlugField(50)  |        |
| `logo_url`    | CharField(500) | null   |
| `description` | TextField      | null   |
| `is_active`   | BooleanField   |        |
| `deleted_at`  | DateTimeField  | null   |
| `created_at`  | DateTimeField  |        |
| `updated_at`  | DateTimeField  |        |

قیدها: `brand_slug_unique_live`

### Category

جدول `catalog_category`

| فیلد              | نوع                  | ویژگی |
| ----------------- | -------------------- | ----- |
| `id`              | BigAutoField         | PK    |
| `name`            | CharField(150)       |       |
| `slug`            | SlugField(50)        |       |
| `parent`          | FK → Category        | null  |
| `description`     | TextField            | null  |
| `image_main`      | CharField(500)       | null  |
| `image_banner`    | CharField(500)       | null  |
| `image_thumbnail` | CharField(500)       | null  |
| `sort_order`      | PositiveIntegerField |       |
| `is_active`       | BooleanField         |       |
| `deleted_at`      | DateTimeField        | null  |
| `created_at`      | DateTimeField        |       |
| `updated_at`      | DateTimeField        |       |

قیدها: `category_slug_unique_live`

### ImportJob

جدول `catalog_importjob` — §۷.۴۰–۷.۴۶. `file` جای `fileUrl` Prisma (فایل در MEDIA)؛ `column_mapping` الحاقیه‌ی Django — نگاشت ستون‌های همین فایل که برای دفعه‌ی بعد هم پیشنهاد می‌شود. `headers` سرستون‌های خوانده‌شده از ردیف اول.

| فیلد              | نوع            | ویژگی                                           |
| ----------------- | -------------- | ----------------------------------------------- |
| `id`              | BigAutoField   | PK                                              |
| `file`            | FileField      |                                                 |
| `original_name`   | CharField(255) |                                                 |
| `headers`         | JSONField      |                                                 |
| `column_mapping`  | JSONField      |                                                 |
| `status`          | CharField(12)  | choices: PENDING, PROCESSING, COMPLETED, FAILED |
| `started_at`      | DateTimeField  | null                                            |
| `completed_at`    | DateTimeField  | null                                            |
| `total_rows`      | IntegerField   |                                                 |
| `successful_rows` | IntegerField   |                                                 |
| `failed_rows`     | IntegerField   |                                                 |
| `error`           | TextField      |                                                 |
| `created_by`      | FK → User      | null                                            |
| `created_at`      | DateTimeField  |                                                 |

### ImportJobRow

جدول `catalog_importjobrow`

| فیلد            | نوع            | ویژگی                             |
| --------------- | -------------- | --------------------------------- |
| `id`            | BigAutoField   | PK                                |
| `import_job`    | FK → ImportJob |                                   |
| `row_number`    | IntegerField   |                                   |
| `status`        | CharField(8)   | choices: SUCCESS, FAILED, SKIPPED |
| `action`        | CharField(10)  |                                   |
| `sku_matched`   | CharField(50)  | null                              |
| `error_message` | TextField      | null                              |
| `raw_data`      | JSONField      | null                              |

### PriceHistory

جدول `catalog_pricehistory` — روی واریانت (نه محصول) — apps/api/prisma/schema/03-pricing.prisma.

| فیلد             | نوع                 | ویژگی |
| ---------------- | ------------------- | ----- |
| `id`             | BigAutoField        | PK    |
| `variant`        | FK → ProductVariant |       |
| `previous_price` | BigIntegerField     |       |
| `new_price`      | BigIntegerField     |       |
| `changed_by`     | FK → User           | null  |
| `reason`         | CharField(255)      | null  |
| `created_at`     | DateTimeField       |       |

### PriceRule

جدول `catalog_pricerule` — تصمیم د — سطح تأمین‌کننده یا دسته؛ هر دو null = پیش‌فرض سراسری.

| فیلد                          | نوع             | ویژگی                    |
| ----------------------------- | --------------- | ------------------------ |
| `id`                          | BigAutoField    | PK                       |
| `supplier`                    | FK → Supplier   | null                     |
| `category`                    | FK → Category   | null                     |
| `profit_type`                 | CharField(10)   | choices: AMOUNT, PERCENT |
| `profit_amount_toman`         | BigIntegerField | null                     |
| `profit_percent_basis_points` | IntegerField    | null                     |
| `is_active`                   | BooleanField    |                          |
| `created_at`                  | DateTimeField   |                          |
| `updated_at`                  | DateTimeField   |                          |

قیدها: `price_rule_profit_matches_type`

### Product

جدول `catalog_product`

| فیلد                     | نوع                  | ویژگی                                   |
| ------------------------ | -------------------- | --------------------------------------- |
| `id`                     | BigAutoField         | PK                                      |
| `name`                   | CharField(200)       |                                         |
| `slug`                   | SlugField(50)        |                                         |
| `brand`                  | FK → Brand           |                                         |
| `category`               | FK → Category        |                                         |
| `model_number`           | CharField(100)       | null                                    |
| `gtin`                   | CharField(50)        | null                                    |
| `part_number`            | CharField(100)       | null                                    |
| `description`            | TextField            | null                                    |
| `short_description`      | CharField(160)       | null                                    |
| `condition`              | CharField(10)        | choices: NEW, OPEN_BOX, STOCK, LIKE_NEW |
| `status`                 | CharField(10)        | choices: ACTIVE, INACTIVE               |
| `is_visible_on_site`     | BooleanField         |                                         |
| `is_visible_in_search`   | BooleanField         |                                         |
| `is_visible_in_category` | BooleanField         |                                         |
| `return_policy_note`     | TextField            | null                                    |
| `shipping_note`          | TextField            | null                                    |
| `priority`               | IntegerField         |                                         |
| `warranty_months`        | PositiveIntegerField | null                                    |
| `warranty_provider`      | CharField(150)       | null                                    |
| `requires_serial`        | BooleanField         |                                         |
| `deleted_at`             | DateTimeField        | null                                    |
| `created_at`             | DateTimeField        |                                         |
| `updated_at`             | DateTimeField        |                                         |

قیدها: `product_slug_unique_live`

### ProductImage

جدول `catalog_productimage`

| فیلد         | نوع                  | ویژگی |
| ------------ | -------------------- | ----- |
| `id`         | BigAutoField         | PK    |
| `product`    | FK → Product         |       |
| `url`        | CharField(500)       |       |
| `alt_text`   | CharField(200)       | null  |
| `sort_order` | PositiveIntegerField |       |
| `is_primary` | BooleanField         |       |

### ProductSpecification

جدول `catalog_productspecification` — دقیقاً یکی از product/variant پر است — مشخصات مشترک روی Product، مشخصات‌محور-واریانت روی ProductVariant.

| فیلد            | نوع                          | ویژگی |
| --------------- | ---------------------------- | ----- |
| `id`            | BigAutoField                 | PK    |
| `definition`    | FK → SpecificationDefinition |       |
| `value`         | FK → SpecificationValue      | null  |
| `custom_value`  | CharField(150)               | null  |
| `numeric_value` | DecimalField                 | null  |
| `product`       | FK → Product                 | null  |
| `variant`       | FK → ProductVariant          | null  |

### ProductVariant

جدول `catalog_productvariant` — §۱ الحاقیه‌ی T-003 — هر Product حداقل یک Variant دارد؛ قیمت/موجودی/SKU اینجاست، نه روی Product.

| فیلد                          | نوع             | ویژگی                                |
| ----------------------------- | --------------- | ------------------------------------ |
| `id`                          | BigAutoField    | PK                                   |
| `product`                     | FK → Product    |                                      |
| `sku`                         | CharField(50)   |                                      |
| `name`                        | CharField(200)  | null                                 |
| `is_default`                  | BooleanField    |                                      |
| `price_model`                 | CharField(25)   | choices: FIXED, SUPPLIER_PLUS_PROFIT |
| `supplier_price`              | BigIntegerField | null                                 |
| `profit_type`                 | CharField(10)   | null · choices: AMOUNT, PERCENT      |
| `profit_amount_toman`         | BigIntegerField | null                                 |
| `profit_percent_basis_points` | IntegerField    | null                                 |
| `final_price`                 | BigIntegerField |                                      |
| `compare_at_price`            | BigIntegerField | null                                 |
| `is_preorder`                 | BooleanField    |                                      |
| `deleted_at`                  | DateTimeField   | null                                 |
| `created_at`                  | DateTimeField   |                                      |
| `updated_at`                  | DateTimeField   |                                      |

قیدها: `variant_sku_unique_live`، `variant_one_default_per_product`، `variant_profit_value_shape`

### SpecificationDefinition

جدول `catalog_specificationdefinition`

| فیلد              | نوع                  | ویژگی                                                                    |
| ----------------- | -------------------- | ------------------------------------------------------------------------ |
| `id`              | BigAutoField         | PK                                                                       |
| `key`             | SlugField(100)       | unique                                                                   |
| `name_fa`         | CharField(150)       |                                                                          |
| `type`            | CharField(15)        | choices: TEXT, NUMBER, BOOLEAN, SELECT, MULTI_SELECT, RANGE, COLOR, DATE |
| `unit`            | CharField(20)        | null                                                                     |
| `category`        | FK → Category        | null                                                                     |
| `is_required`     | BooleanField         |                                                                          |
| `is_filterable`   | BooleanField         |                                                                          |
| `is_searchable`   | BooleanField         |                                                                          |
| `is_variant_axis` | BooleanField         |                                                                          |
| `sort_order`      | PositiveIntegerField |                                                                          |

### SpecificationValue

جدول `catalog_specificationvalue`

| فیلد         | نوع                          | ویژگی |
| ------------ | ---------------------------- | ----- |
| `id`         | BigAutoField                 | PK    |
| `definition` | FK → SpecificationDefinition |       |
| `value`      | CharField(150)               |       |
| `swatch_hex` | CharField(7)                 | null  |
| `sort_order` | PositiveIntegerField         |       |

### Supplier

جدول `catalog_supplier`

| فیلد            | نوع            | ویژگی |
| --------------- | -------------- | ----- |
| `id`            | BigAutoField   | PK    |
| `name`          | CharField(150) |       |
| `contact_name`  | CharField(150) | null  |
| `contact_phone` | CharField(30)  | null  |
| `contact_email` | CharField(254) | null  |
| `notes`         | TextField      | null  |
| `is_active`     | BooleanField   |       |
| `created_at`    | DateTimeField  |       |
| `updated_at`    | DateTimeField  |       |

### SupplierProduct

جدول `catalog_supplierproduct` — §۸.۳۶ — روی واریانت (الحاقیه‌ی T-003). `price` قیمت همکار این تأمین‌کننده است؛ ارزان‌ترین ردیف در دسترس، قیمت همکار واریانت می‌شود.

| فیلد              | نوع                 | ویژگی |
| ----------------- | ------------------- | ----- |
| `id`              | BigAutoField        | PK    |
| `supplier`        | FK → Supplier       |       |
| `variant`         | FK → ProductVariant |       |
| `price`           | BigIntegerField     |       |
| `is_available`    | BooleanField        |       |
| `source`          | CharField(100)      | null  |
| `last_updated_at` | DateTimeField       |       |

قیدها: `supplier_product_unique`

## orders

### Cart

جدول `orders_cart` — Guest carts (session_key set, user null) merge into the user's cart on login.

| فیلد              | نوع                 | ویژگی |
| ----------------- | ------------------- | ----- |
| `id`              | BigAutoField        | PK    |
| `user`            | FK → User           | null  |
| `session_key`     | CharField(40)       |       |
| `coupon`          | FK → Coupon         | null  |
| `shipping_method` | FK → ShippingMethod | null  |
| `created_at`      | DateTimeField       |       |
| `updated_at`      | DateTimeField       |       |

قیدها: `one_cart_per_user`، `one_cart_per_guest_session`

### CartItem

جدول `orders_cartitem` — D-02 §۲ — روی واریانت (نه product+color_option).

| فیلد                  | نوع                  | ویژگی |
| --------------------- | -------------------- | ----- |
| `id`                  | BigAutoField         | PK    |
| `cart`                | FK → Cart            |       |
| `variant`             | FK → ProductVariant  |       |
| `quantity`            | PositiveIntegerField |       |
| `unit_price_snapshot` | PositiveIntegerField |       |

### CouponUsage

جدول `orders_couponusage` — D-05 §۴ — یک ردیف به ازای هر استفاده‌ی موفق؛ سقف کل/هر کاربر از شمارش همین جدول enforce می‌شود (`Coupon.is_exhausted`، `content/models.py`)، نه یک شمارنده‌ی جدا که می‌تواند drift کند. در apps/orders نه apps/content چون به Order وابسته است (از circular import با ForeignKey رشته‌ای رد شده).

| فیلد              | نوع                  | ویژگی |
| ----------------- | -------------------- | ----- |
| `id`              | BigAutoField         | PK    |
| `coupon`          | FK → Coupon          |       |
| `user`            | FK → User            |       |
| `order`           | FK → Order           |       |
| `discount_amount` | PositiveIntegerField |       |
| `created_at`      | DateTimeField        |       |

### Order

جدول `orders_order` — D-05 §۱ — عیناً `apps/api/prisma/schema/05-order.prisma`'س Order. آدرس به‌صورت Snapshot در خود سفارش کپی می‌شود (نه FK به Address) — اصل Price Snapshot تعمیم‌یافته به آدرس، چون آدرس کاربر ممکن است بعداً ویرایش/حذف شود ولی سفارش قدیمی نباید عوض شود.

| فیلد                       | نوع                  | ویژگی                                                                                                    |
| -------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------- |
| `id`                       | BigAutoField         | PK                                                                                                       |
| `order_number`             | CharField(30)        | unique                                                                                                   |
| `user`                     | FK → User            |                                                                                                          |
| `status`                   | CharField(20)        | choices: PENDING, AWAITING_PAYMENT, PAYMENT_REVIEW, PAID, PROCESSING, READY_TO_SHIP, SHIPPED, DELIVERED… |
| `payment_status`           | CharField(20)        | choices: UNPAID, RECEIPT_UPLOADED, UNDER_REVIEW, CONFIRMED                                               |
| `shipping_recipient_name`  | CharField(100)       |                                                                                                          |
| `shipping_mobile`          | CharField(20)        |                                                                                                          |
| `shipping_province`        | CharField(100)       |                                                                                                          |
| `shipping_city`            | CharField(100)       |                                                                                                          |
| `shipping_address_line`    | CharField(500)       |                                                                                                          |
| `shipping_postal_code`     | CharField(10)        | null                                                                                                     |
| `subtotal`                 | PositiveIntegerField |                                                                                                          |
| `discount_total`           | PositiveIntegerField |                                                                                                          |
| `shipping_cost`            | PositiveIntegerField |                                                                                                          |
| `shipping_method_name`     | CharField(100)       |                                                                                                          |
| `final_total`              | PositiveIntegerField |                                                                                                          |
| `cancel_reason`            | CharField(255)       | null                                                                                                     |
| `paid_at`                  | DateTimeField        | null                                                                                                     |
| `shipped_at`               | DateTimeField        | null                                                                                                     |
| `delivered_at`             | DateTimeField        | null                                                                                                     |
| `admin_notified_at`        | DateTimeField        | null                                                                                                     |
| `invoice_pdf`              | FileField            | null                                                                                                     |
| `invoice_pdf_generated_at` | DateTimeField        | null                                                                                                     |
| `invoice_type`             | CharField(10)        | choices: PERSONAL, CORPORATE                                                                             |
| `company_name`             | CharField(200)       | null                                                                                                     |
| `national_id`              | CharField(11)        | null                                                                                                     |
| `economic_code`            | CharField(30)        | null                                                                                                     |
| `registration_number`      | CharField(30)        | null                                                                                                     |
| `idempotency_key`          | CharField(100)       | null                                                                                                     |
| `created_at`               | DateTimeField        |                                                                                                          |
| `updated_at`               | DateTimeField        |                                                                                                          |

قیدها: `unique_order_idempotency_key_per_user`

### OrderItem

جدول `orders_orderitem` — Snapshot کامل — تغییر بعدی محصول/واریانت را تحت‌تأثیر قرار نمی‌دهد. `variant` عمداً nullable می‌ماند: اگر واریانت بعداً حذف شد، سفارش قدیمی باید هنوز بگوید مشتری چه خریده (الحاقیه، هشدار).

| فیلد                    | نوع                  | ویژگی |
| ----------------------- | -------------------- | ----- |
| `id`                    | BigAutoField         | PK    |
| `order`                 | FK → Order           |       |
| `variant`               | FK → ProductVariant  | null  |
| `product_name_snapshot` | CharField(200)       |       |
| `variant_name_snapshot` | CharField(200)       | null  |
| `sku_snapshot`          | CharField(50)        |       |
| `spec_snapshot`         | JSONField            | null  |
| `unit_price`            | PositiveIntegerField |       |
| `quantity`              | PositiveIntegerField |       |
| `discount`              | PositiveIntegerField |       |
| `final_price`           | PositiveIntegerField |       |
| `created_at`            | DateTimeField        |       |

### OrderItemUnit

جدول `orders_orderitemunit` — E-03 §۳ — یک ردیف به ازای هر عدد از هر قلم سفارش (quantity=2 یعنی دو ردیف)، هر کدام سریال/شناسه‌ی کارت گارانتی خودش را دارد. ورود سریال از پنل ادمین (بچ ۰۴) — فعلاً Django admin هم کافی است (سند تسک §۳).

| فیلد             | نوع            | ویژگی  |
| ---------------- | -------------- | ------ |
| `id`             | BigAutoField   | PK     |
| `order_item`     | FK → OrderItem |        |
| `serial_number`  | CharField(100) | null   |
| `certificate_id` | CharField(20)  | unique |
| `created_at`     | DateTimeField  |        |

### OrderStatusHistory

جدول `orders_orderstatushistory` — §۱۱.۵۱ — هر تغییر وضعیت یک ردیف؛ `order_status.py` تنها نویسنده است.

| فیلد          | نوع            | ویژگی                                                                                                           |
| ------------- | -------------- | --------------------------------------------------------------------------------------------------------------- |
| `id`          | BigAutoField   | PK                                                                                                              |
| `order`       | FK → Order     |                                                                                                                 |
| `from_status` | CharField(20)  | null · choices: PENDING, AWAITING_PAYMENT, PAYMENT_REVIEW, PAID, PROCESSING, READY_TO_SHIP, SHIPPED, DELIVERED… |
| `to_status`   | CharField(20)  | choices: PENDING, AWAITING_PAYMENT, PAYMENT_REVIEW, PAID, PROCESSING, READY_TO_SHIP, SHIPPED, DELIVERED…        |
| `changed_by`  | FK → User      | null                                                                                                            |
| `note`        | CharField(255) | null                                                                                                            |
| `created_at`  | DateTimeField  |                                                                                                                 |

### Payment

جدول `orders_payment` — §۸.۴۶ + الحاقیه بخش ۴ — انتزاع درگاه، شکل داده فقط. `gateway` identity واقعی پلاگین است (apps/orders/providers) — کارت‌به‌کارت مقدارش خالی می‌ماند؛ `provider` مقدار عمومی/قرارداد (NONE/BALEPAY) است، از `gateway` مشتق می‌شود (`sync_provider`).

| فیلد               | نوع                  | ویژگی                                                       |
| ------------------ | -------------------- | ----------------------------------------------------------- |
| `id`               | BigAutoField         | PK                                                          |
| `order`            | FK → Order           |                                                             |
| `method`           | CharField(20)        | choices: MANUAL_CARD_TO_CARD, GATEWAY                       |
| `provider`         | CharField(10)        | choices: NONE, BALEPAY                                      |
| `gateway`          | CharField(20)        | null · choices: ZARINPAL, IDPAY, SNAPPPAY, DIGIPAY, BALEPAY |
| `status`           | CharField(20)        | choices: UNPAID, RECEIPT_UPLOADED, UNDER_REVIEW, CONFIRMED  |
| `amount`           | PositiveIntegerField |                                                             |
| `provider_ref`     | CharField(100)       | null                                                        |
| `provider_payload` | JSONField            | null                                                        |
| `created_at`       | DateTimeField        |                                                             |
| `updated_at`       | DateTimeField        |                                                             |

### PaymentReceipt

جدول `orders_paymentreceipt` — §۸.۴۷/۸.۴۸ — رسید پرداخت دستی. `file` در `receipts/private/` ذخیره می‌شود، خارج از هر مسیر public که مستقیم سرو شود (D-05 §۳: «نه عمومی») — apps/public_api/receipt_storage.py دسترسی را از طریق یک endpoint احراز‌هویت‌شده می‌دهد، نه لینک مستقیم media.

| فیلد               | نوع                  | ویژگی                                |
| ------------------ | -------------------- | ------------------------------------ |
| `id`               | BigAutoField         | PK                                   |
| `payment`          | FK → Payment         |                                      |
| `user`             | FK → User            |                                      |
| `file`             | FileField            |                                      |
| `amount`           | PositiveIntegerField |                                      |
| `uploaded_at`      | DateTimeField        |                                      |
| `status`           | CharField(10)        | choices: PENDING, APPROVED, REJECTED |
| `reviewed_by`      | FK → User            | null                                 |
| `reviewed_at`      | DateTimeField        | null                                 |
| `rejection_reason` | CharField(500)       | null                                 |

### Return

جدول `orders_return` — §۸.۵۲ — قلم‌به‌قلم، از طریق `ReturnItem` (چون سفارش می‌تواند فقط جزئاً مرجوع شود). مستقل از Order.status (پایانی‌ترین وضعیت DELIVERED است؛ Return هیچ‌وقت Order.status را عوض نمی‌کند).

| فیلد          | نوع            | ویژگی                                                      |
| ------------- | -------------- | ---------------------------------------------------------- |
| `id`          | BigAutoField   | PK                                                         |
| `order`       | FK → Order     |                                                            |
| `reason`      | CharField(500) |                                                            |
| `description` | TextField      | null                                                       |
| `status`      | CharField(10)  | choices: REQUESTED, APPROVED, REJECTED, RECEIVED, REFUNDED |
| `admin_note`  | TextField      | null                                                       |
| `created_at`  | DateTimeField  |                                                            |
| `updated_at`  | DateTimeField  |                                                            |

### ReturnItem

جدول `orders_returnitem` — اتصال Return↔OrderItem با تعداد — ممکن است فقط بخشی از تعداد سفارش‌شده مرجوع شود، برخلاف M2M ساده‌ی نسخه‌ی قبلی.

| فیلد             | نوع                  | ویژگی                                |
| ---------------- | -------------------- | ------------------------------------ |
| `id`             | BigAutoField         | PK                                   |
| `return_request` | FK → Return          |                                      |
| `order_item`     | FK → OrderItem       |                                      |
| `quantity`       | PositiveIntegerField |                                      |
| `decision`       | CharField(10)        | choices: PENDING, APPROVED, REJECTED |

### Shipment

جدول `orders_shipment` — §۸.۴۹ تا §۸.۵۱ — یک سفارش یک Shipment (بدون مرسوله‌ی چندتکه). عمداً فیلد status جدا ندارد — SHIPPED/DELIVERED همین حالا در Order.status است؛ فیلد سوم یعنی نقض Single Source of Truth (همان استدلال Prisma).

| فیلد              | نوع                  | ویژگی  |
| ----------------- | -------------------- | ------ |
| `id`              | BigAutoField         | PK     |
| `order`           | 1:1 → Order          | unique |
| `provider`        | CharField(100)       |        |
| `cost`            | PositiveIntegerField |        |
| `tracking_number` | CharField(100)       | null   |
| `tracking_url`    | CharField(500)       | null   |
| `shipped_at`      | DateTimeField        | null   |
| `delivered_at`    | DateTimeField        | null   |
| `created_at`      | DateTimeField        |        |
| `updated_at`      | DateTimeField        |        |

## inventory

### Inventory

جدول `inventory_inventory`

| فیلد                  | نوع                  | ویژگی |
| --------------------- | -------------------- | ----- |
| `variant`             | 1:1 → ProductVariant | PK    |
| `quantity`            | IntegerField         |       |
| `reserved_quantity`   | IntegerField         |       |
| `available_quantity`  | IntegerField         |       |
| `low_stock_threshold` | IntegerField         | null  |
| `version`             | IntegerField         |       |
| `created_at`          | DateTimeField        |       |
| `updated_at`          | DateTimeField        |       |

قیدها: `inventory_available_quantity_non_negative`

### InventoryTransaction

جدول `inventory_inventorytransaction` — کاردکس — هر تغییر موجودی یک ردیف اینجا هم می‌سازد.

| فیلد              | نوع                 | ویژگی                                                          |
| ----------------- | ------------------- | -------------------------------------------------------------- |
| `id`              | BigAutoField        | PK                                                             |
| `variant`         | FK → ProductVariant |                                                                |
| `type`            | CharField(12)       | choices: STOCK_IN, STOCK_OUT, ADJUSTMENT, RESERVATION, RELEASE |
| `quantity_change` | IntegerField        |                                                                |
| `quantity_before` | IntegerField        |                                                                |
| `quantity_after`  | IntegerField        |                                                                |
| `user`            | FK → User           | null                                                           |
| `reference`       | CharField(100)      | null                                                           |
| `note`            | TextField           | null                                                           |
| `created_at`      | DateTimeField       |                                                                |

## content

### AboutPage

جدول `content_aboutpage` — G-01 — متن‌های «درباره ما» قابل ویرایش از پنل (singleton، pk=1). هر بخش خالی در فروشگاه پنهان می‌شود؛ هیچ متن پیش‌فرضی نوشته نشده. principles: [{title, body}] · timeline: [{year, note}] · team: [{name, role}]

| فیلد               | نوع            | ویژگی |
| ------------------ | -------------- | ----- |
| `id`               | BigAutoField   | PK    |
| `hero_title`       | CharField(200) |       |
| `hero_body`        | TextField      |       |
| `story_title`      | CharField(200) |       |
| `story_body`       | TextField      |       |
| `principles_title` | CharField(200) |       |
| `principles`       | JSONField      |       |
| `timeline_title`   | CharField(200) |       |
| `timeline`         | JSONField      |       |
| `team_title`       | CharField(200) |       |
| `team`             | JSONField      |       |
| `updated_at`       | DateTimeField  |       |

### BlogPost

جدول `content_blogpost`

| فیلد                 | نوع                  | ویژگی                                                 |
| -------------------- | -------------------- | ----------------------------------------------------- |
| `id`                 | BigAutoField         | PK                                                    |
| `slug`               | SlugField(50)        | unique                                                |
| `title`              | CharField(200)       |                                                       |
| `excerpt`            | CharField(300)       |                                                       |
| `category`           | CharField(20)        | choices: راهنمای خرید, بررسی, مقایسه, نگهداری, گیمینگ |
| `sections`           | JSONField            |                                                       |
| `cover_image`        | FileField            | null                                                  |
| `external_cover_url` | CharField(500)       |                                                       |
| `cover_alt`          | CharField(200)       |                                                       |
| `author`             | CharField(100)       |                                                       |
| `author_role`        | CharField(100)       |                                                       |
| `tags`               | JSONField            |                                                       |
| `reading_time`       | PositiveIntegerField |                                                       |
| `is_published`       | BooleanField         |                                                       |
| `meta_title`         | CharField(200)       |                                                       |
| `meta_description`   | CharField(300)       |                                                       |
| `published_at`       | DateTimeField        | null                                                  |
| `created_at`         | DateTimeField        |                                                       |

### Campaign

جدول `content_campaign` — F-03 — `06-marketing.prisma`'s Campaign. `rules` (JSON آزاد در Prisma) اینجا شکل ثابت دارد: `{"discountType": "PERCENT"|"AMOUNT", "value": n}` (درصد صحیح یا مبلغ تومان).

| فیلد         | نوع            | ویژگی |
| ------------ | -------------- | ----- |
| `id`         | BigAutoField   | PK    |
| `name`       | CharField(150) |       |
| `start_at`   | DateTimeField  |       |
| `end_at`     | DateTimeField  |       |
| `is_active`  | BooleanField   |       |
| `priority`   | IntegerField   |       |
| `rules`      | JSONField      | null  |
| `created_at` | DateTimeField  |       |
| `updated_at` | DateTimeField  |       |

### CampaignProduct

جدول `content_campaignproduct` — محصول _یا_ دسته — دقیقاً یکی.

| فیلد       | نوع           | ویژگی |
| ---------- | ------------- | ----- |
| `id`       | BigAutoField  | PK    |
| `campaign` | FK → Campaign |       |
| `product`  | FK → Product  | null  |
| `category` | FK → Category | null  |

قیدها: `campaign_target_exactly_one`

### ContactMessage

جدول `content_contactmessage`

| فیلد            | نوع                   | ویژگی  |
| --------------- | --------------------- | ------ |
| `id`            | BigAutoField          | PK     |
| `tracking_code` | CharField(20)         | unique |
| `name`          | CharField(150)        |        |
| `email`         | CharField(254)        |        |
| `phone`         | CharField(20)         |        |
| `subject`       | CharField(100)        |        |
| `order_number`  | CharField(30)         |        |
| `message`       | TextField             |        |
| `newsletter`    | BooleanField          |        |
| `is_read`       | BooleanField          |        |
| `admin_note`    | TextField             |        |
| `ip_address`    | GenericIPAddressField | null   |
| `submitted_at`  | DateTimeField         |        |

### Coupon

جدول `content_coupon` — D-05 §۴ — عیناً `apps/api/prisma/schema/06-marketing.prisma`'س Coupon. نسخه‌ی قبلی (وایب) کوپن را به دسته/محصول محدود می‌کرد (`categories`/ `products` M2M) — چیزی که مدل Prisma اصلاً ندارد؛ چون D-05.md صریح گفته «کوپن طبق Prisma»، این محدودسازی حذف شد (کوپن روی کل سبد اعمال می‌شود، نه بخشی از آن) — یک ساده‌سازی مستند، نه گم‌شدن قابلیت اتفاقی. شمارش مصرف هم از یک شمارنده‌ی ساده (`used_count`) به جدول واقعی `CouponUsage` (apps/orders/models.py — چون به Order وابسته است) منتقل شد تا هم سقف کل هم سقف هر کاربر از رکورد واقعی enforce شود، نه یک عدد قابل‌drift.

| فیلد                      | نوع                  | ویژگی                    |
| ------------------------- | -------------------- | ------------------------ |
| `id`                      | BigAutoField         | PK                       |
| `code`                    | CharField(30)        | unique                   |
| `type`                    | CharField(10)        | choices: PERCENT, AMOUNT |
| `amount_toman`            | PositiveIntegerField | null                     |
| `percent_basis_points`    | PositiveIntegerField | null                     |
| `minimum_order_amount`    | PositiveIntegerField | null                     |
| `maximum_discount_amount` | PositiveIntegerField | null                     |
| `usage_limit`             | PositiveIntegerField | null                     |
| `per_user_limit`          | PositiveIntegerField | null                     |
| `start_date`              | DateTimeField        | null                     |
| `end_date`                | DateTimeField        | null                     |
| `is_active`               | BooleanField         |                          |
| `created_at`              | DateTimeField        |                          |
| `updated_at`              | DateTimeField        |                          |

### Favorite

جدول `content_favorite`

| فیلد            | نوع                 | ویژگی |
| --------------- | ------------------- | ----- |
| `id`            | BigAutoField        | PK    |
| `user`          | FK → User           |       |
| `product`       | FK → Product        |       |
| `variant`       | FK → ProductVariant | null  |
| `price_at_save` | BigIntegerField     | null  |
| `created_at`    | DateTimeField       |       |

قیدها: `unique_user_product_favorite`

### HomepageBlock

جدول `content_homepageblock` — §۸.۵۷+ سند مقایسه‌ی وایب‌شاپ — جایگزین سه مدل تک‌کاره‌ی وایب (HeroSection/HomeShowcase/CommunityTile) با یک مدل بلوک‌محور مثل Nest.

| فیلد            | نوع                  | ویژگی                                                                                    |
| --------------- | -------------------- | ---------------------------------------------------------------------------------------- |
| `id`            | BigAutoField         | PK                                                                                       |
| `type`          | CharField(20)        | choices: HERO, CATEGORY_GRID, FLAGSHIP_DUEL, PRODUCT_RAIL, CAMPAIGN, BENEFITS, BLOG_RAIL |
| `sort_order`    | PositiveIntegerField |                                                                                          |
| `is_active`     | BooleanField         |                                                                                          |
| `title`         | CharField(200)       | null                                                                                     |
| `subtitle`      | CharField(300)       | null                                                                                     |
| `cta_label`     | CharField(100)       | null                                                                                     |
| `cta_url`       | CharField(300)       | null                                                                                     |
| `image_desktop` | CharField(500)       | null                                                                                     |
| `image_mobile`  | CharField(500)       | null                                                                                     |
| `image_alt`     | CharField(200)       | null                                                                                     |
| `config`        | JSONField            | null                                                                                     |
| `starts_at`     | DateTimeField        | null                                                                                     |
| `ends_at`       | DateTimeField        | null                                                                                     |
| `created_at`    | DateTimeField        |                                                                                          |
| `updated_at`    | DateTimeField        |                                                                                          |

### LegalDocument

جدول `content_legaldocument` — G-01 — اسناد صفحه‌ی قوانین؛ متن فقط از پنل (سند خالی = پنهان). body: متن ساده با پاراگراف‌های جدا با خط خالی؛ خطی که با «## » شروع شود زیرعنوان است.

| فیلد         | نوع            | ویژگی                                                         |
| ------------ | -------------- | ------------------------------------------------------------- |
| `id`         | BigAutoField   | PK                                                            |
| `key`        | CharField(20)  | unique · choices: terms, privacy, shipping, returns, warranty |
| `title`      | CharField(150) |                                                               |
| `body`       | TextField      |                                                               |
| `updated_at` | DateTimeField  |                                                               |

### ProductReview

جدول `content_productreview`

| فیلد                | نوع                       | ویژگی                                |
| ------------------- | ------------------------- | ------------------------------------ |
| `id`                | BigAutoField              | PK                                   |
| `product`           | FK → Product              |                                      |
| `user`              | FK → User                 | null                                 |
| `rating`            | PositiveSmallIntegerField |                                      |
| `title`             | CharField(150)            |                                      |
| `body`              | TextField                 |                                      |
| `status`            | CharField(10)             | choices: pending, approved, rejected |
| `admin_reply`       | TextField                 |                                      |
| `verified_purchase` | BooleanField              |                                      |
| `created_at`        | DateTimeField             |                                      |

قیدها: `review_one_per_user_product`

### Redirect

جدول `content_redirect` — G-02 — ریدایرکت مسیرهای فروشگاه؛ middleware فروشگاه (Next) اعمال می‌کند. تغییر slug محصول/دسته/نوشته و حذف محصول خودکار یک 301 می‌سازد (signals.py).

| فیلد          | نوع                       | ویژگی             |
| ------------- | ------------------------- | ----------------- |
| `id`          | BigAutoField              | PK                |
| `from_path`   | CharField(500)            | unique            |
| `to_path`     | CharField(500)            |                   |
| `status_code` | PositiveSmallIntegerField | choices: 301, 302 |
| `is_active`   | BooleanField              |                   |
| `is_auto`     | BooleanField              |                   |
| `hits`        | PositiveIntegerField      |                   |
| `last_hit_at` | DateTimeField             | null              |
| `created_at`  | DateTimeField             |                   |
| `updated_at`  | DateTimeField             |                   |

### SeoMetadata

جدول `content_seometadata` — F-02 — عیناً `07-content.prisma`'s SeoMetadata (یک ردیف به ازای هر محصول/دسته/برند). API عمومی محصول از قبل فیلد `seo` (title/description/ canonical) دارد که تا اینجا همیشه null بود؛ حالا از این ردیف پر می‌شود.

| فیلد               | نوع            | ویژگی         |
| ------------------ | -------------- | ------------- |
| `id`               | BigAutoField   | PK            |
| `meta_title`       | CharField(200) | null          |
| `meta_description` | CharField(320) | null          |
| `canonical`        | CharField(500) | null          |
| `robots`           | CharField(100) | null          |
| `og_title`         | CharField(200) | null          |
| `og_description`   | CharField(320) | null          |
| `og_image`         | CharField(500) | null          |
| `category`         | 1:1 → Category | unique · null |
| `brand`            | 1:1 → Brand    | unique · null |
| `product`          | 1:1 → Product  | unique · null |

## settings

### ApiCredential

جدول `settings_apicredential` — credentials is encrypted at rest — swappable from the admin panel, no redeploy needed.

| فیلد          | نوع                  | ویژگی                                                           |
| ------------- | -------------------- | --------------------------------------------------------------- |
| `id`          | BigAutoField         | PK                                                              |
| `service`     | CharField(20)        | choices: kavenegar, zarinpal, idpay, snapppay, digipay, balepay |
| `label`       | CharField(100)       |                                                                 |
| `credentials` | TextField            |                                                                 |
| `is_active`   | BooleanField         |                                                                 |
| `is_sandbox`  | BooleanField         |                                                                 |
| `order`       | PositiveIntegerField |                                                                 |
| `logo`        | FileField            | null                                                            |
| `description` | CharField(150)       |                                                                 |

### ShippingMethod

جدول `settings_shippingmethod`

| فیلد             | نوع                  | ویژگی |
| ---------------- | -------------------- | ----- |
| `id`             | BigAutoField         | PK    |
| `name`           | CharField(100)       |       |
| `cost`           | PositiveIntegerField |       |
| `free_above`     | PositiveIntegerField | null  |
| `estimated_days` | CharField(50)        |       |
| `is_active`      | BooleanField         |       |
| `order`          | PositiveIntegerField |       |

### SiteSettings

جدول `settings_sitesettings` — Singleton — always pk=1. Use SiteSettings.load() to fetch/create it.

| فیلد                       | نوع                  | ویژگی |
| -------------------------- | -------------------- | ----- |
| `id`                       | BigAutoField         | PK    |
| `business_name`            | CharField(150)       |       |
| `economic_code`            | CharField(30)        |       |
| `national_id`              | CharField(30)        |       |
| `phone_display`            | CharField(30)        |       |
| `phone_href`               | CharField(30)        |       |
| `email`                    | CharField(254)       |       |
| `address`                  | CharField(300)       |       |
| `postal_code`              | CharField(10)        |       |
| `business_hours`           | JSONField            |       |
| `test_period_days`         | PositiveIntegerField |       |
| `warranty_terms`           | TextField            |       |
| `instagram_url`            | CharField(200)       |       |
| `telegram_url`             | CharField(200)       |       |
| `whatsapp_url`             | CharField(200)       |       |
| `linkedin_url`             | CharField(200)       |       |
| `youtube_url`              | CharField(200)       |       |
| `pinterest_url`            | CharField(200)       |       |
| `google_maps_embed`        | TextField            |       |
| `latitude`                 | DecimalField         | null  |
| `longitude`                | DecimalField         | null  |
| `trust_badge_label`        | CharField(100)       |       |
| `trust_badge_image`        | FileField            | null  |
| `trust_badge_image_url`    | CharField(500)       |       |
| `trust_badge_url`          | CharField(500)       |       |
| `payment_gateway_label`    | CharField(100)       |       |
| `payment_gateway_image`    | FileField            | null  |
| `logo_light`               | FileField            | null  |
| `logo_dark`                | FileField            | null  |
| `favicon`                  | FileField            | null  |
| `default_og_image`         | FileField            | null  |
| `google_analytics_id`      | CharField(50)        |       |
| `google_tag_manager_id`    | CharField(50)        |       |
| `owner_notification_phone` | CharField(200)       |       |
| `notify_owner_new_order`   | BooleanField         |       |
| `card_to_card_holder_name` | CharField(100)       |       |
| `card_to_card_number`      | CharField(20)        |       |
| `card_to_card_sheba`       | CharField(30)        |       |
| `card_to_card_active`      | BooleanField         |       |

## analytics

### AdminActivityLog

جدول `analytics_adminactivitylog` — Who changed what and when — appended by admin API views, never edited.

| فیلد         | نوع            | ویژگی |
| ------------ | -------------- | ----- |
| `id`         | BigAutoField   | PK    |
| `user`       | FK → User      | null  |
| `action`     | CharField(100) |       |
| `model_name` | CharField(100) |       |
| `object_id`  | CharField(50)  |       |
| `changes`    | JSONField      | null  |
| `created_at` | DateTimeField  |       |

### DailyStat

جدول `analytics_dailystat` — Aggregated nightly from PageView (see tasks.aggregate_daily_stats) — 'total views' must always be read from here, never from a live PageView count, or the dashboard gets slower every day forever.

| فیلد              | نوع                  | ویژگی  |
| ----------------- | -------------------- | ------ |
| `id`              | BigAutoField         | PK     |
| `date`            | DateField            | unique |
| `page_views`      | PositiveIntegerField |        |
| `unique_visitors` | PositiveIntegerField |        |
| `orders`          | PositiveIntegerField |        |
| `revenue`         | PositiveIntegerField |        |

### PageView

جدول `analytics_pageview` — BACKEND-TASK.md's spec assumes Django serves pages directly (a middleware watching GET requests); this project is a decoupled SPA — the storefront never touches Django at all, so recording happens via POST /api/analytics/pageview/ that the frontend calls on navigation instead. Same privacy rule either way: no raw IP is ever stored, only a daily-salted hash (see views.PageViewCreateView).

| فیلد           | نوع            | ویژگی |
| -------------- | -------------- | ----- |
| `id`           | BigAutoField   | PK    |
| `path`         | CharField(255) |       |
| `visitor_hash` | CharField(64)  |       |
| `referrer`     | CharField(500) |       |
| `user_agent`   | CharField(500) |       |
| `is_bot`       | BooleanField   |       |
| `product_slug` | CharField(255) | null  |
| `created_at`   | DateTimeField  |       |

## notifications

### SmsLog

جدول `notifications_smslog` — Append-only — the only way to answer 'the SMS never arrived'.

| فیلد                      | نوع              | ویژگی                         |
| ------------------------- | ---------------- | ----------------------------- |
| `id`                      | BigAutoField     | PK                            |
| `phone`                   | CharField(11)    |                               |
| `template`                | FK → SmsTemplate | null                          |
| `body`                    | TextField        |                               |
| `kavenegar_template_name` | CharField(100)   |                               |
| `kavenegar_tokens`        | JSONField        |                               |
| `status`                  | CharField(10)    | choices: queued, sent, failed |
| `provider_message_id`     | CharField(100)   |                               |
| `error`                   | TextField        |                               |
| `created_at`              | DateTimeField    |                               |

### SmsTemplate

جدول `notifications_smstemplate` — Edited from the admin panel so copy can change without a redeploy.

| فیلد                      | نوع            | ویژگی  |
| ------------------------- | -------------- | ------ |
| `id`                      | BigAutoField   | PK     |
| `key`                     | SlugField(50)  | unique |
| `title`                   | CharField(150) |        |
| `body`                    | TextField      |        |
| `is_active`               | BooleanField   |        |
| `kavenegar_template_name` | CharField(100) |        |
| `kavenegar_token_map`     | JSONField      |        |

## admin_api

### AdminRole

جدول `admin_api_adminrole` — A thin wrapper over Django's own Group (BACKEND-TASK.md §7.5: 'از سیستم Group و Permission خود جنگو استفاده شود، نه پیاده‌سازی موازی') — the actual permission grants live on group.permissions as real django.contrib.auth.Permission rows; this model only adds the admin-panel-specific metadata Group doesn't have.

| فیلد          | نوع            | ویژگی  |
| ------------- | -------------- | ------ |
| `id`          | BigAutoField   | PK     |
| `group`       | 1:1 → Group    | unique |
| `description` | CharField(255) |        |
| `is_system`   | BooleanField   |        |
| `created_at`  | DateTimeField  |        |

### SearchConsoleIndexStatus

جدول `admin_api_searchconsoleindexstatus` — Singleton — always pk=1, like SiteSettings.

| فیلد            | نوع                  | ویژگی |
| --------------- | -------------------- | ----- |
| `id`            | BigAutoField         | PK    |
| `indexed_count` | PositiveIntegerField |       |
| `error_count`   | PositiveIntegerField |       |
| `issues`        | JSONField            |       |
| `updated_at`    | DateTimeField        |       |

### SearchConsolePage

جدول `admin_api_searchconsolepage`

| فیلد          | نوع                  | ویژگی |
| ------------- | -------------------- | ----- |
| `id`          | BigAutoField         | PK    |
| `date`        | DateField            |       |
| `page`        | CharField(500)       |       |
| `impressions` | PositiveIntegerField |       |
| `clicks`      | PositiveIntegerField |       |
| `ctr`         | FloatField           |       |
| `position`    | FloatField           |       |

### SearchConsolePerformance

جدول `admin_api_searchconsoleperformance`

| فیلد           | نوع                  | ویژگی  |
| -------------- | -------------------- | ------ |
| `id`           | BigAutoField         | PK     |
| `date`         | DateField            | unique |
| `impressions`  | PositiveIntegerField |        |
| `clicks`       | PositiveIntegerField |        |
| `ctr`          | FloatField           |        |
| `avg_position` | FloatField           |        |
| `created_at`   | DateTimeField        |        |

### SearchConsoleQuery

جدول `admin_api_searchconsolequery`

| فیلد          | نوع                  | ویژگی |
| ------------- | -------------------- | ----- |
| `id`          | BigAutoField         | PK    |
| `date`        | DateField            |       |
| `query`       | CharField(255)       |       |
| `impressions` | PositiveIntegerField |       |
| `clicks`      | PositiveIntegerField |       |
| `ctr`         | FloatField           |       |
| `position`    | FloatField           |       |

### SearchConsoleSitemapStatus

جدول `admin_api_searchconsolesitemapstatus` — Singleton — always pk=1.

| فیلد              | نوع                  | ویژگی |
| ----------------- | -------------------- | ----- |
| `id`              | BigAutoField         | PK    |
| `last_read_at`    | DateTimeField        | null  |
| `discovered_urls` | PositiveIntegerField |       |
| `updated_at`      | DateTimeField        |       |
