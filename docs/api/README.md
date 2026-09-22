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

اعداد پیش‌فرض‌اند نه ثابت سخت‌کدشده (برند بوک عدد نداده) — پیاده‌سازی
واقعی باید از `Setting`/env قابل‌تنظیم باشد. `OTP_VERIFY_MAX_ATTEMPTS = 5`
به‌ازای هر کد (نه در یک بازه)؛ `OTP_CODE_TTL_SECONDS = 300`، پس از آن
`OTP_EXPIRED` نه `OTP_INVALID`.

## نقشه‌ی مجوزها (`permissions-map.ts`)

هر endpoint دقیقاً یکی از سه حالت را دارد: `"public"` (بدون ورود)،
`"authenticated"` (فقط ورود)، یا کلید Permission به شکل `domain.action`
(بند ۸.۱۱، مثل `products.update`). همه‌ی مسیرهای `/admin/*` باید مجوز
داشته باشند — هرگز `public`/`authenticated` خام (تست
`permissions-map.test.ts` این را اجباری می‌کند). `users.impersonate`
طبق seed فقط روی نقش «مدیر ارشد» است.

## دامنه‌ها و endpointها

### auth — `src/auth/`

`POST /auth/otp/request` (public) · `POST /auth/otp/verify` (public) ·
`POST /auth/refresh` (public) · `POST /auth/logout` (auth) ·
`GET /auth/me` (auth) · `POST /auth/impersonate/exchange` (public، بلیت‌محور)

### catalog — `src/catalog/` (همه public)

`GET /catalog/categories` (درخت بازگشتی) · `GET /catalog/categories/:slug` ·
`GET /catalog/products` · `GET /catalog/products/:slug` ·
`GET /catalog/search` · `GET /catalog/filters`

### cart — `src/cart/` (همه auth)

`GET /cart` · `POST /cart/items` · `PATCH /cart/items/:id` ·
`DELETE /cart/items/:id` — بدون فیلد قیمت در بدنه‌ی درخواست (§۸.۵۵).

### order — `src/order/` (همه auth)

`POST /orders` · `GET /orders` · `GET /orders/:orderNumber` ·
`POST /orders/:orderNumber/receipt` ·
`POST /orders/:orderNumber/payment/initiate`

### payment — `src/payment/`

`POST /payments/callback/:provider` (public، وب‌هوک درگاه) ·
`GET /payments/return/:provider` (public، فقط UX)

### account — `src/account/` (همه auth)

Profile، Address (CRUD + `isDefault`)، Wishlist (CRUD)

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
است حاضر است؛ `installment` وقتی غیرفعال/زیر آستانه است اصلاً در پاسخ
نیست (نه `null`).

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
