# قرارداد API — ArByte (T-004)

منبع حقیقت مشترک بین بک‌اند و فرانت. اسکیماهای Zod واقعی در
`packages/contracts/src/` زندگی می‌کنند — این سند فقط نقشه‌ی راه و
تصمیم‌های کلیدی است، نه کپی‌ی شکل داده‌ها (شکل دقیق را از خودِ فایل‌های
`.ts` بخوانید، چون این سند synced-by-hand است و ممکن است عقب بیفتد).

Swagger تولیدشده از همین قراردادها در dev روی `/api/docs` بالا می‌آید
(`apps/api/src/openapi/registry.ts`، بند ۱۲.۱۵ برند بوک) — نه از
`@ApiProperty()` دستی.

## پوشش پاسخ (Response Envelope)

هر endpoint موفق (کد ۲xx) دقیقاً یکی از این دو شکل را برمی‌گرداند
(`packages/contracts/src/common/response.ts`):

```
{ data: T, meta: { requestId } }                                        // تکی
{ data: T[], meta: { requestId, pagination: {page,perPage,total,totalPages} } } // فهرست صفحه‌بندی‌شده
```

هر endpoint ناموفق (کد ۴xx/۵xx، بند ۸.۹۳) این شکل ثابت را دارد
(`common/error-codes.ts`):

```
{ code: ErrorCode, message: string /* فارسی */, fieldErrors?: Record<string,string>, requestId: string }
```

`code` انگلیسی و ماشین‌خوان است (هرگز مستقیم نمایش داده نمی‌شود)؛
`message` همیشه فارسی و لحن §۲.۱۸/۶.۷۶ (محترمانه، راه‌حل‌محور) است و
پیش‌فرضش در `ERROR_MESSAGES` (`common/error-codes.ts`) آمده. کد HTTP واقعی
را همچنان `AllExceptionsFilter` تعیین می‌کند؛ این پوشش فقط بدنه‌ی JSON
است، جایگزین status code نیست.

### کدهای خطا (۲۸ مورد، `common/error-codes.ts`)

عمومی: `VALIDATION_ERROR` `UNAUTHORIZED` `FORBIDDEN` `NOT_FOUND` `CONFLICT`
`RATE_LIMITED` `OTP_INVALID` `OTP_EXPIRED` `OTP_MAX_ATTEMPTS`
`INSUFFICIENT_STOCK` `PRICE_CHANGED` `CART_EMPTY` `ORDER_NOT_MODIFIABLE`
`PAYMENT_ALREADY_CONFIRMED` `UPLOAD_TOO_LARGE` `UPLOAD_INVALID_TYPE`
`INTERNAL_ERROR` `SERVICE_UNAVAILABLE`

الحاقیه: `VARIANT_NOT_FOUND` `VARIANT_UNAVAILABLE` `INVALID_STATUS_TRANSITION`
`IMPERSONATION_TICKET_INVALID` `IMPERSONATION_TICKET_EXPIRED`
`IMPERSONATION_TICKET_USED` `IMPERSONATION_FORBIDDEN_ACTION` `GATEWAY_ERROR`
`GATEWAY_TIMEOUT` `GATEWAY_AMOUNT_MISMATCH`

## محدودیت نرخ درخواست (`common/rate-limits.ts`)

| قانون                 | حد  | بازه     | scope  |
| --------------------- | --- | -------- | ------ |
| `otpRequestPerMobile` | ۳   | ۱۰ دقیقه | mobile |
| `otpRequestPerIp`     | ۱۰  | ۱ ساعت   | ip     |
| `adminLoginPerIp`     | ۵   | ۱۵ دقیقه | ip     |
| `publicApiPerIp`      | ۱۰۰ | ۱ دقیقه  | ip     |
| `uploadPerUser`       | ۲۰  | ۱ ساعت   | user   |
| `orderTrackPerIp`     | ۱۰  | ۱ ساعت   | ip     |

اعداد پیش‌فرض‌اند نه ثابت سخت‌کدشده (برند بوک عدد نداده) — پیاده‌سازی
واقعی باید از `Setting`/env قابل‌تنظیم باشد. `OTP_VERIFY_MAX_ATTEMPTS = 5`
به‌ازای هر کد (نه در یک بازه)؛ `OTP_CODE_TTL_SECONDS = 300`، پس از آن
`OTP_EXPIRED` نه `OTP_INVALID`.

## نقشه‌ی مجوزها (`permissions-map.ts`)

هر endpoint دقیقاً یکی از چهار حالت را دارد: `"public"` (بدون ورود)،
`"authenticated"` (فقط ورود)، `"guest-or-authenticated"` (بدون ورود با
X-Cart-Session یا با ورود — فقط سبد، D-04 §۳)، یا کلید Permission به شکل
`domain.action` (بند ۸.۱۱، مثل `products.update`). همه‌ی مسیرهای
`/admin/*` باید مجوز داشته باشند — هرگز `public`/`authenticated` خام
(تست `permissions-map.test.ts` این را اجباری می‌کند). `users.impersonate`
طبق seed فقط روی نقش «مدیر ارشد» است.

## دامنه‌ها و endpointها

### auth — `src/auth/`

`POST /auth/otp/request` (public) · `POST /auth/otp/verify` (public،
بدنه با `cartSessionKey` اختیاری — D-04 §۱/§۳: اگر حاضر باشد سبد مهمان
موقع ورود در سبد کاربر ادغام می‌شود) · `POST /auth/refresh` (public) ·
`POST /auth/logout` (auth) · `GET /auth/me` (auth) ·
`POST /auth/impersonate/exchange` (public، بلیت‌محور)

### catalog — `src/catalog/` (همه public)

`GET /catalog/categories` (درخت بازگشتی) · `GET /catalog/categories/:slug` ·
`GET /catalog/products` · `GET /catalog/products/:slug` ·
`GET /catalog/search` · `GET /catalog/filters`

### cart — `src/cart/` (`guest-or-authenticated` — D-04 §۳)

`GET /cart` · `POST /cart/items` · `PATCH /cart/items/:id` ·
`DELETE /cart/items/:id` — بدون فیلد قیمت در بدنه‌ی درخواست (§۸.۵۵).

سبد سمت سرور، روی واریانت. بدون ورود: هدر `X-Cart-Session` — سرور یک
کلید تازه می‌سازد و در همین هدر روی هر پاسخ سبد برمی‌گرداند (پیش‌فرض
`CORS_EXPOSE_HEADERS`، وگرنه fetch مرورگر هدرهای سفارشی cross-origin را
نمی‌بیند)؛ کلاینت باید آن را نگه دارد (apps/web:
`localStorage["arbyte:cart-session:v1"]`) و روی درخواست‌های بعدی همان
هدر را بفرستد. با ورود: `Authorization` کافی است، `X-Cart-Session` نادیده
گرفته می‌شود. ادغام سبد مهمان در سبد کاربر فقط موقع `otp/verify` (بالا)
رخ می‌دهد، نه یک endpoint جدا — جمع تعداد هر واریانت، سقف ۵ عدد و سقف
موجودی لحظه‌ای هر دو رعایت می‌شوند.

`POST /cart/coupon` (`{code}`) · `DELETE /cart/coupon` (بدون بدنه) ·
`PATCH /cart/shipping-method` (`{shippingMethodId}`) — E-02 §۳، جدید.
انتخاب کوپن/روش‌ارسال روی خودِ سبد ذخیره می‌شود (نه فقط لحظه‌ی ثبت
سفارش)؛ `GET /cart` هر بار زنده دوباره اعتبارسنجی می‌کند و اگر منقضی/
غیرفعال شده باشد خاموش پاکش می‌کند (خطا نمی‌دهد). `CartSchema` هم
`discountTotal`/`coupon`/`shippingCost`/`shippingMethod`/`finalTotal` را
اضافه کرد — همه سرور-محاسبه، فرانت هرگز این‌ها را خودش جمع نمی‌زند.
`PATCH /cart/shipping-method` مسیرش در سند تسک صریح نیامده بود، افزوده‌ی
لازم این تسک است (docs/QUESTIONS.md Q-25).

### order — `src/order/` (همه auth مگر ذکرشده)

`POST /orders` · `GET /orders` · `GET /orders/:orderNumber` ·
`POST /orders/:orderNumber/receipt` ·
`GET /orders/:orderNumber/invoice.pdf` ·
`GET /orders/:orderNumber/units/:certificateId/warranty.pdf` ·
`POST /orders/:orderNumber/return` ·
`POST /orders/:orderNumber/payment/initiate` ·
`POST /orders/track` (**public** — پیگیری مهمان، rate-limit سخت)

`CreateOrderBodySchema`: `addressId`، `paymentMethod`،
`shippingMethodId?`، `couponCode?` (هر دو نبودن یعنی سرور به انتخاب
ذخیره‌شده روی سبد برمی‌گردد، E-02 §۴)، `invoiceType?` (`PERSONAL`
پیش‌فرض یا `CORPORATE`)، و برای فاکتور حقوقی `companyName`/`nationalId`
الزامی + `economicCode?`/`registrationNumber?` اختیاری — این فیلدها حل‌
کننده‌ی D-05 §۲'s Q-22 (تناقض سند/مدل) هستند؛ مدل مرجع Django است، نه
Prisma. قیمت/محاسبات همیشه سرور — بدنه هرگز عدد قیمت نمی‌فرستد.

**E-03 §۳/۴ — `units` روی هر `OrderItemSchema`.** فقط در `GET
/orders/:orderNumber` (مالک سفارش) پر می‌شود: `{serialNumber, certificateId}`
به ازای هر واحد (`OrderItemUnit`، ورود سریال فعلاً از Django admin — رابط
ادمین بچ۰۴). `GET /orders` (فهرست) همین `OrderSchema` را برمی‌گرداند اما
`units` را نمی‌فرستد (`undefined`، نه آرایه‌ی خالی) — سریال محصول فقط برای
صاحب لاگین‌کرده‌ی سفارش قابل مشاهده است.

**E-05 §۲ — `POST /orders/track` اسکیمای جدا (`GuestOrderSchema`)، نه
`OrderSchema`.** حریم خصوصی: مهمان فقط `shippingCity` می‌بیند (نه
`shippingAddress` کامل — نام گیرنده/موبایل/نشانی خیابان/کدپستی)، و
`invoice`/`payment` هم اصلاً در پاسخ نیستند (کاربرد UI پیگیری مهمان به آن‌ها
نیاز ندارد). `items` همان `OrderItemSchema` است بدون `units` (همان قاعده‌ی
بالا).

**E-05 §۱ — `OrderSchema.cardToCardAccount`.** فقط وقتی روش پرداخت سفارش
`MANUAL_CARD_TO_CARD` است پر می‌شود (`{cardNumber, sheba, holderName}` از
`SiteSettings`، همان مقادیری که `order_services.card_to_card_enabled()`
چک می‌کند) — «اطلاعات حساب از API، نه هاردکد». برای بقیه‌ی روش‌های
پرداخت `null` است.

**E-04 — سه سند PDF با هویت آربایت** (`apps/documents`، فونت Estedad
خودمیزبان، پالت برند، ارقام فارسی، بدون برند وایب). فاکتور (`invoice.pdf`)
از لحظه‌ی `PAID`؛ کارت گارانتی (`GET
/orders/:orderNumber/units/:certificateId/warranty.pdf`) فقط بعد از
`SHIPPED` و فقط برای مالکِ همان واحد (`certificate_id` باید متعلق به همان
سفارش باشد، وگرنه ۴۰۴). برگه‌ی بسته‌بندی/برچسب ارسال/کارت‌های گارانتی
دسته‌ای فقط سمت ادمین‌اند (`/api/admin/orders/:id/{packing-slip,
shipping-label, warranty-cards}.pdf` — این‌ها در permissions-map نیستند،
چون آن فایل فقط مسیرهای `/api/v1/*` مشتری را پوشش می‌دهد، نه `/api/admin/*`
که با `require_section()` جدا کنترل می‌شود).

**Idempotency-Key.** هدر اختیاری `Idempotency-Key` روی `POST /orders` —
اگر همان کاربر با همان کلید دوباره درخواست بدهد (کلیک دوم روی «ثبت
سفارش» در شبکه‌ی کند)، سرور بدون لمس دوباره‌ی سبد/موجودی همان سفارش اول
را برمی‌گرداند (یکتایی جزئی روی `(user, idempotencyKey)`، NULL نامحدود
مجاز است). `OrderSchema` هم یک `invoice: {type, companyName, nationalId,
economicCode, registrationNumber}` دارد.

### payment — `src/payment/`

`POST /payments/callback/:provider` (public، وب‌هوک درگاه) ·
`GET /payments/return/:provider` (public، فقط UX) ·
`GET /payment-methods` (public — E-02 §۴، جدید)

`GET /payment-methods` فهرست واقعاً در دسترس را برمی‌گرداند، نه همه‌ی
گزینه‌های طراحی‌شده: کارت‌به‌کارت فقط اگر `SiteSettings` کامل پر شده،
`GATEWAY` فقط اگر حداقل یک `ApiCredential` فعال با credentials معتبر
داشته باشد (در عمل فقط بله‌پی، چهارتای دیگر مستندات ندارند).

### shipping — `src/shipping/`

`GET /shipping-methods` (public — E-02 §۳، جدید؛ D-05 تصمیم گرفته بود
این endpoint لازم نیست، اما `/cart` و `/checkout` واقعی به یک فهرست
انتخاب‌پذیر نیاز داشتند). فهرست فقط شامل روش‌های فعال، مرتب‌شده بر اساس
`order` سپس `cost`.

### account — `src/account/` (همه auth)

Profile، Address (CRUD + `isDefault`)، Wishlist (CRUD +
`POST /account/wishlist/merge` — D-04 §۲، جدید). `WishlistItemSchema` یک
`priceAtSave` هم دارد (قیمت لحظه‌ی ذخیره؛ صفحه‌ی `/wishlist` تغییر قیمت
را از این و قیمت زنده‌ی واریانت حساب می‌کند). `merge` آرایه‌ای از
`{ productSlug, variantId?, priceAtSave? }` می‌گیرد — برای انتقال
علاقه‌مندی محلی (`localStorage`، قبل از ورود) بعد از ورود؛ با
`productSlug` شناسایی می‌شود چون localStorage قبل از ورود فقط slug دارد،
و آیتمی که از قبل در حساب کاربر بود دست نمی‌خورد (merge، نه overwrite).

**E-05 §۳ — `GET /account/devices` (جدید).** «دستگاه‌های من»: یک ردیف به
ازای هر `OrderItemUnit` از سفارش‌های `DELIVERED` کاربر (E-03/E-04) —
`productName`/`serialNumber`/`testPeriodEndDate`/`hasWarranty`/
`warrantyEndDate`، تاریخ‌ها رشته‌ی فارسیِ از پیش‌فرمت‌شده (همان تابعی که
کارت گارانتی استفاده می‌کند، `apps.documents.warranty_card.build_warranty_card`
— یک منبع محاسبه، نه تکرار قواعد تاریخ).

**E-05 §۳ — `ProfileSchema.memberSince` (جدید).** «عضو از» در
`Account.dc.html`؛ از `User.created_at` (نه `date_joined` استاندارد جنگو —
مدل کاربر این پروژه سفارشی است). فقط `GET`/`PATCH /account/profile` این
را برمی‌گردانند، نه پاسخ ورود (`AuthUserSchema`، جدا نگه داشته شد چون فقط
UI حساب کاربری به آن نیاز دارد).

### content — `src/content/`

`GET /content/homepage` (public)

### admin — `src/admin/` (همه پشت Permission)

محصولات/برندها/دسته‌بندی‌ها/مشخصات، موجودی، سفارش‌ها (+ تغییر وضعیت)،
پرداخت‌ها/رسیدها، کاربران/نقش‌ها (+ impersonate)، تنظیمات، Audit Log
(فقط خواندنی)، بلوک‌های صفحه‌ی اصلی (+ reorder).

## تصمیم‌های کلیدی

**شکل پاسخ محصول (وریانت‌محور).** `PublicProductDetailSchema` شامل
`variantAxes` (کدام مشخصه‌ها پیکربندی‌ها را متمایز می‌کنند) و
`variants[]` است؛ هر وریانت `label`ی دارد که سمت سرور با `buildVariantLabel()`
(`catalog/variant-label.ts`) از `variantAxes` ساخته می‌شود (نه ترتیب کلید
آبجکت)، مثلاً `"۶۴GB · ۲TB"`. فیلد `quantity` فقط وقتی وضعیت `LOW_STOCK`
است حاضر است.

**کارت محصول در فهرست/جست‌وجو.** `ProductCardSchema` طبق تصمیم الحاقیه:
`defaultVariant` (یک وریانت، برای نمایش قیمت/موجودی) + `hasMultipleVariants`

- `variantCount` — نه کل آرایه‌ی وریانت‌ها. انتخاب وریانت نمایشی با
  `selectCardVariant()` (`catalog/variant-selection.ts`): اگر فیلتر spec
  فعال است و با وریانت پیش‌فرض جور در نمی‌آید، اولین وریانت _منطبق_ انتخاب
  می‌شود، نه پیش‌فرض (مثال الحاقیه: فیلتر RAM=32GB روی محصولی با پیش‌فرض
  64GB باید قیمت نسخه‌ی 32GB را نشان دهد).

**Impersonation (الحاقیه §۶).** بلیت فقط در بدنه‌ی POST رد و بدل می‌شود
(هرگز در URL/query — تاریخچه‌ی مرورگر و لاگ). سشن جعل‌هویت با `imp: true`
در JWT مشخص می‌شود؛ `IMPERSONATION_BLOCKED_ACTIONS` (`auth/index.ts`) هفت
عملیات نوشتنی حساس را فهرست می‌کند (سفارش جدید، شروع پرداخت، تغییر
رمز/موبایل، نوشتن آدرس، حذف حساب، ویرایش پروفایل) — خواندن همیشه آزاد
است. `GET /auth/me` همیشه `impersonation: {by, startedAt}` را برمی‌گرداند
وقتی سشن جعلی است، تا فرانت بتواند نوار هشدار دائمی نشان دهد.

**درگاه پرداخت (بله‌پی، الحاقیه §۷).** فقط شکل، بدون منطق —مستندات
provider هنوز نرسیده. بازگشت مرورگر کاربر (`GET /payments/return/:provider`)
**هرگز** پرداخت را تأیید نمی‌کند (کاربر می‌تواند URL را دستکاری کند)؛
فقط `pendingVerification: true` برمی‌گرداند. تأیید واقعی فقط از وب‌هوک
(`POST /payments/callback/:provider`) با HMAC/امضا است. Idempotency روی
`providerRef` مسئولیت لایه‌ی سرویس است (schema این را اجرا نمی‌کند).

**تغییر وضعیت سفارش (§۵).** `ORDER_STATUS_TRANSITIONS`
(`order/status-transitions.ts`) جدول کامل ۹ وضعیتی گذارهای مجاز است؛
`isValidOrderStatusTransition()` تابع خالص روی همین جدول. برخلاف بقیه‌ی
T-004 که فقط قرارداد است، اینجا طبق دستور صریح الحاقیه یک سرویس واقعی هم
ساخته شده: `OrderStatusService.transitionTo()`
(`apps/api/src/orders/order-status.service.ts`) با `prisma.$transaction`،
که روی گذار نامعتبر `ConflictException({code:"INVALID_STATUS_TRANSITION"})`
پرتاب می‌کند. یک seam برای اعلان (`OrderNotifier`/`ORDER_NOTIFIER`) هم
گذاشته شده با پیاده‌سازی no-op پیش‌فرض، برای صف اعلان واقعی بعدی.

**جداسازی سخت‌گیرانه‌ی عمومی/ادمین (قانون ۶، §۴ الحاقیه).**
`admin/product.ts` مستقل از `catalog/product.ts` نوشته شده — هرگز با
`.omit()` از روی اسکیمای ادمین ساخته نمی‌شود، چون یک فیلد جدید حساس که
فراموش شود به‌صورت خودکار به public نشت می‌کند. فیلدهای حساس
(`supplierPrice`, `profitType`, `profitAmountToman`,
`profitPercentBasisPoints` در `AdminProductVariantSchema`؛
`amountToman`, `percentBasisPoints` در کوپن) فقط در فایل‌های `admin/*`
تعریف شده‌اند. تست `catalog/product-security.test.ts` این را با یک سناریوی
بدترین‌حالت اثبات می‌کند: یک آبجکت خام حاوی همه‌ی فیلدهای ادمین+عمومی
مخلوط، وقتی از `PublicProductDetailSchema.parse()` رد شود (Zod به‌صورت
پیش‌فرض کلید ناشناس را strip می‌کند، نه passthrough)، هیچ‌کدام از شش فیلد
حساس در JSON خروجی نیست.

**رزولوشن بلوک‌های صفحه‌ی اصلی (§۸ الحاقیه).** `PublicHomepageBlockSchema`
یک discriminated union روی `type` است. فقط `PRODUCT_RAIL` (محصولات
حل‌شده با شکل `ProductCardSchema`) و `CATEGORY_GRID` (دسته‌بندی‌های
حل‌شده) رزولوشن محتوای غنی مشخصی در الحاقیه دارند. `HERO`/`BENEFITS` فقط
محتوای پایه (متن/تصویر/CTA) دارند که کافی است. `CAMPAIGN` و `BLOG_RAIL`
عمداً به همین سطح پایه محدود مانده‌اند — رزولوشن غنی‌تر (محصولات کمپین،
پست‌های وبلاگ) چون این دو دامنه هنوز در فهرست صریح endpointهای T-004
نیستند، به تسک بعدی موکول شده است.

**واحد پول و اعداد.** `MoneyAmountSchema = z.number().int().positive()`
— مبلغ به تومان (نه ریال، ر.ک. `docs/data-model.md`)، به‌صورت عدد صحیح
JSON، نه رشته‌ی BigInt؛ چون مبالغ تومانی هرگز به مرز safe-integer
جاوااسکریپت نزدیک نمی‌شوند (برخلاف پایگاه‌داده که `BigInt` واقعی است، قانون
۷). `normalizeDigits` قبل از هر ولیدیشن رشته‌ای (موبایل، کد پستی، OTP)
ارقام فارسی/عربی را به لاتین تبدیل می‌کند (قانون ۹).

**T-150 — پیاده‌سازی واقعی پنج اندپوینت خواندنی کاتالوگ + محتوای صفحه‌ی
اصلی.** تصمیم‌های پیاده‌سازی که سند تسک صریح نگفته بود:

- **PREORDER — گپ قرارداد/مدل.** `AvailabilitySchema` مقدار `PREORDER`
  دارد اما هیچ فیلدی در مدل داده نبود که آن را بسازد (فقط
  quantity/threshold که IN_STOCK/LOW_STOCK/OUT_OF_STOCK می‌سازند). با
  مدیر پروژه هماهنگ شد: فیلد `ProductVariant.isPreorder Boolean` اضافه
  شد — وقتی true است، صرف‌نظر از quantity، وضعیت PREORDER است
  (`apps/api/prisma/schema/02-catalog.prisma`).
- **`keySpecs` در `ProductCardSchema`.** سند تسک نمونه‌ی کارت فهرست را با
  `keySpecs` (حداکثر چهار مشخصه) نشان داده بود، ولی این فیلد در قرارداد
  اولیه‌ی T-004 نبود — اضافه شد (فیلد افزایشی، بدون شکستن پاسخ موجود).
- **حداکثر `perPage` کاتالوگ عمومی ۶۰، نه ۱۰۰.** `PaginationQuerySchema`
  مشترک همچنان حداکثر ۱۰۰ است (دامنه‌های ادمین دست‌نخورده می‌مانند)؛
  `ProductListQuerySchema`/`SearchQuerySchema` مقدار `perPage` را با
  `.extend()` به حداکثر ۶۰ سخت‌گیرانه‌تر کرده‌اند — طبق الزام صریح پرفورمنس
  سند تسک، نه یک ابهام قرارداد.
- **مرتب‌سازی `price_asc`/`price_desc`/`popular`.** Prisma نمی‌تواند
  به‌صورت بومی روی MIN/MAX یک رابطه‌ی to-many مرتب کند؛ چون مقیاس کاتالوگ
  کوچک است (فروشگاه بوتیک، نه مارکت‌پلیس انبوه)، فهرست فیلترشده یک‌جا با
  `relationLoadStrategy: "join"` گرفته می‌شود و مرتب‌سازی/صفحه‌بندی در کد
  اپلیکیشن انجام می‌شود (نه در دیتابیس) — همچنان ≤۲ کوئری کل. `popular` از
  `Product.priority` (§۱۱.۳۰) + `createdAt` به‌عنوان تای‌بریکر استفاده
  می‌کند، چون هنوز آمار سفارش/تحلیل واقعی وجود ندارد.
- **سه فلگ نمایش (`isVisibleOnSite`/`isVisibleInSearch`/`isVisibleInCategory`).**
  §۷.۱۴ سه فلگ مستقل دارد، نه یک enum «visibility» واحد. تفسیر پیاده‌سازی:
  `isVisibleOnSite` سوییچ اصلی همه‌جا (شامل صفحه‌ی جزئیات با دسترسی
  مستقیم)؛ `GET /catalog/products` علاوه‌براین `isVisibleInCategory` هم
  می‌خواهد؛ `GET /catalog/search` علاوه‌براین `isVisibleInSearch`.
- **`SpecificationGroupSchema.groupName`.** مدل داده هیچ فیلد گروه‌بندی
  مشخصات ندارد؛ چون طراحی واقعی صفحه‌ی محصول (`Product.dc.html`) مشخصات
  را یک آرایه‌ی تخت نشان می‌دهد، یک گروه عمومی («مشخصات فنی») کافی است.
- **`GET /catalog/categories/:slug` در محدوده‌ی این تسک نیست.** در قرارداد
  و در README هست، اما فهرست پنج‌تایی صریح سند تسک آن را نام نبرده — عمداً
  ساخته نشد.
- **کشف مهم: `ZodValidationPipe` سراسری زیر `tsx` هرگز چیزی را اعتبارسنجی
  نمی‌کرد.** تشخیص خودکار DTO به `ArgumentMetadata.metatype` وابسته است
  که به `emitDecoratorMetadata` نیاز دارد — چیزی که `tsx` (موتور
  dev/start این پروژه) پیاده نمی‌کند. یعنی نه‌فقط اندپوینت‌های Query جدید
  این تسک، بلکه `@Body()` اندپوینت‌های ادمین قبلی (T-101) هم هرگز واقعاً
  اعتبارسنجی نمی‌شدند (۵۰۰ INTERNAL_ERROR به‌جای ۴۰۰ VALIDATION_ERROR روی
  بدنه‌ی نامعتبر). `ZodValidationPipe` حالا `schema` را هم به‌صورت آرگومان
  سازنده می‌پذیرد (`new ZodValidationPipe(Schema)` روی خودِ پارامتر)،
  مستقل از تشخیص متاتایپ. اندپوینت‌های کاتالوگ این تسک اصلاح شدند؛ اصلاح
  کامل `@Body()`های ادمین قبلی خارج از محدوده‌ی این تسک است (نه CRUD
  ادمین) — یک تسک جدا لازم دارد.
- **N+1 و شمار کوئری.** `PRODUCT_INCLUDE` تودرتو + `relationLoadStrategy:
"join"` (نیازمند `previewFeatures = ["relationJoins"]` در generator)
  فهرست کاتالوگ را از ۱۳ کوئری batched به ۲ کوئری واقعی رساند (۱ برای
  آستانه‌ی سراسری موجودی کم، ۱ JOIN واحد برای محصول+برند+دسته+تصاویر+
  مشخصات+واریانت+موجودی+مشخصات‌واریانت) — اندازه‌گیری‌شده با
  `PRISMA_LOG_QUERIES=1` روی `/catalog/products?perPage=24`.

**D-05 — سفارش/پرداخت/کوپن/ارسال/مرجوعی (بازنویسی Nest→Django).** پیاده‌سازی
واقعی روی `apps/backend` (نه `apps/api`، طبق بچ ۰۲) — تصمیم‌های خارج از
سند تسک:

- **`initiate_payment()` باید صریحاً به `PAYMENT_REVIEW` گذار کند.** جدول
  گذار فقط `PAYMENT_REVIEW → PAID` را مجاز می‌داند، نه
  `AWAITING_PAYMENT → PAID` — این هم برای کارت‌به‌کارت (آپلود رسید) هم
  درگاه (شروع پرداخت) صادق است؛ هر دو یعنی «کاربر یک اقدام پرداخت مشخص
  انجام داد، حالا منتظر تأیید». یک باگ واقعی همین‌جا پیدا و رفع شد (تست
  `test_duplicate_callback_confirms_only_once`).
- **نوع فاکتور (شخصی/حقوقی) — حل‌شده در E-02.** آن‌موقع (D-05) این
  تناقض بدون تصمیم مانده بود چون مدل مرجع اشتباهاً Prisma فرض شده بود؛
  از D-01 به بعد مدل مرجع Django است (`apps.orders.models.Order`)، پس
  E-02 یک migration جدید اضافه کرد (`invoice_type`، `company_name`،
  `national_id`، `economic_code`، `registration_number`) — دیگر انحراف
  نیست، بخش «order» بالا را ببینید.
- **`GET /shipping-methods` عمومی — ساخته شد در E-02.** در D-05 این
  endpoint لازم فرض نشده بود (`POST /orders` بدون `shippingMethodId` روی
  ارزان‌ترین روش فعال fallback می‌کرد)، اما صفحه‌ی `/cart`/`/checkout`
  واقعی (E-02) به یک فهرست انتخاب‌پذیر نیاز داشت — بخش «shipping» بالا
  را ببینید.
- **رسید پرداخت بدون MinIO/presigned URL واقعی.** این پروژه هیچ
  `django-storages`/`boto3` سیم‌کشی ندارد؛ فایل رسید در
  `MEDIA_ROOT/receipts/private/` (خارج از هر مسیر public) ذخیره و فقط از
  `GET /admin/payments/receipts/:id/file` (احراز‌هویت‌شده، `payments.view`)
  سرو می‌شود — همان اثر «نه عمومی» بدون presigned URL واقعی؛ انحراف
  مستند، نه نقض قانون.
- **کوپن دقیقاً طبق Prisma بازنویسی شد** (نه ساختار قدیمی وایب): scoping
  دسته‌بندی/محصول حذف شد (Prisma's `Coupon` ندارد، همیشه روی کل سبد
  اعمال می‌شود)، `used_count` دیگر ستون ذخیره‌شده نیست — همیشه زنده از
  شمارش `CouponUsage` محاسبه می‌شود.

## نگاشت enum

هر enum پریزمایی که روی سیم عبور می‌کند در `common/enums.ts` یک آینه‌ی
Zod دارد. `apps/api/src/common/contract-enum-sync.test.ts` هر آرایه‌ی
mirror را با `Object.values()` روی enum واقعی Prisma چک می‌کند تا
drift بین دو طرف بی‌صدا رخ ندهد. جداگانه، `apps/api/src/common/enum-labels.ts`
نگاشت `Record<Enum,string>` از هر enum به برچسب فارسی نمایشی دارد (نه
فرض تلویحی هم‌نامی/هم‌حروفی — `PENDING`↔«ثبت‌شده»،
`PAID`↔«پرداخت تأیید‌شده»، `NEW`↔«پلمب» واقعاً کلمات متفاوت‌اند، نه فقط
کیس متفاوت).

## محدودیت شناخته‌شده‌ی ابزار OpenAPI

`@asteasolutions/zod-to-openapi@7.3.4` (آخرین نسخه‌ی سازگار با
`zod@^3.23.8` این پروژه؛ نسخه‌ی ۹ نیازمند `zod@^4` است) نمی‌تواند اسکیمای
بازگشتیِ `z.lazy()` را resolve کند (`UnknownZodTypeError` روی
`CategoryTreeNodeSchema`) — محدودیت شناخته‌شده‌ی خودِ ابزار، نه باگ این
پروژه. مسیر `GET /catalog/categories` عمداً از فهرست ثبت‌شده در
`apps/api/src/openapi/registry.ts` کنار گذاشته شده تا تولید سند خطا
ندهد؛ خودِ قرارداد Zod در `packages/contracts` کاملاً و درست بازگشتی
باقی مانده — فقط نمایش در Swagger UI برای همین یک endpoint به بعد
موکول شده.

## قوانین مرزی بسته‌ها

`packages/contracts` از هر وابستگی مخصوص OpenAPI آزاد است (بدون
`.openapi()`/`extendZodWithOpenApi`) چون `apps/web`/`apps/admin` هم به آن
وابسته‌اند و Swagger لازم ندارند. تمام ثبت OpenAPI فقط داخل
`apps/api/src/openapi/registry.ts` است، با ایمپورت از قراردادها.

## سه store سمت کاربر (T-210 §۶ → D-04 §۴)

`apps/web/src/lib/stores/{cart,wishlist,compare}-store.ts` سه store با
امضای بیرونی یکسان‌اند (`useSyncExternalStore`، بدون prop-drilling)،
اما از D-04 دیگر هر سه یک جور نیستند:

- **`cart-store.ts`** از D-04 سمت سرور است — منبع حقیقت
  `apps/backend/apps/public_api/cart_views.py` (`GET/POST /cart`،
  `PATCH|DELETE /cart/items/:id`) است، نه `localStorage`. `lib/cart-api.ts`
  کلید سشن مهمان را در `arbyte:cart-session:v1` نگه می‌دارد و روی هر
  درخواست در هدر `X-Cart-Session` می‌فرستد/از پاسخ به‌روز می‌کند؛ بعد از
  ورود (بچ ۰۳)، فقط فرستادن `Authorization` کافی است و سرور خودش سبد
  کاربر را ترجیح می‌دهد (`cart_service.py:resolve_cart`). آیتم‌های
  `arbyte:cart:v1` قدیمی (پیش از D-04) یک‌بار به سرور فرستاده و پاک
  می‌شوند (`flushLegacyLocalCart`). ادغام سبد مهمان با کاربر در لحظه‌ی
  ورود، سرور خودش در `POST /auth/otp/verify` (فیلد اختیاری
  `cartSessionKey`) انجام می‌دهد — فرانت کاری نمی‌کند جز فرستادن همان
  کلید سشن. کامپوننت‌های مصرف‌کننده (`AddToCartButton`, `PurchasePanel`,
  `SiteHeader`, `MobileNavBar`, `WishlistView`) دست‌نخورده ماندند —
  امضای `useCartStore()` عوض نشده.
- **`wishlist-store.ts`** هنوز کاملاً کلاینتی است (`localStorage`، کلید
  `arbyte:wishlist:v1`) — تا وقتی صفحه‌ی ورود واقعی وجود ندارد (بچ ۰۳)
  جای دیگری برای merge کردن نیست. یک تابع آماده اضافه شده:
  `syncAfterLogin(accessToken)` که علاقه‌مندی محلی را با
  `POST /account/wishlist/merge` ادغام می‌کند و بعد از موفقیت store
  محلی را پاک می‌کند (سرور منبع حقیقت می‌شود). این تابع **در این بچ به
  هیچ UI وصل نیست** — فقط برای صفحه‌ی ورود بچ ۰۳ آماده شده.
- **`compare-store.ts`** دست‌نخورده و کاملاً کلاینتی مانده — مقایسه
  حساب کاربری ندارد.

- قیمت/موجودی سمت کلاینت ذخیره **نمی‌شود** (به‌جز `priceAtSave` در
  wishlist — استثنای عمدی، برای نمایش «چقدر تغییر کرده»؛ حالا سمت سرور
  هم روی `Favorite.price_at_save` همین استثنا تکرار شده)؛ همیشه از API
  تازه خوانده می‌شود (بند ۸.۵۵).
- الگوی هیدریشن: مقدار اولیه‌ی سرور همیشه خالی است (بدون خطای
  hydration)؛ `useSyncExternalStore` بعد از mount واقعی state را
  می‌خواند (`cart-store` از سرور fetch می‌کند، بقیه از `localStorage`).
  جزئیات در کامنت بالای `create-local-store.ts` و `cart-store.ts`.
