# مدل داده — T-003

اسکیمای Prisma در `apps/api/prisma/schema/` به‌صورت چندفایلی سازمان‌دهی شده
(نه یک `schema.prisma` غول‌پیکر) — هر فایل یک دامنه، دقیقاً هم‌راستا با
تقسیم‌بندی `01-tasks/phase-0/T-003-data-model.md`:

```
00-base.prisma        generator + datasource
01-access.prisma      کاربر، آدرس، نقش، مجوز، OTP، Session
02-catalog.prisma     دسته‌بندی، برند، محصول، Variant، مشخصات
03-pricing.prisma     تأمین‌کننده، قانون سود، تاریخچه‌ی قیمت
04-inventory.prisma   انبار، موجودی، تراکنش موجودی
05-order.prisma       سبد، سفارش، پرداخت، ارسال، مرجوعی
06-marketing.prisma   کوپن، کمپین، HomepageBlock
07-content.prisma     نظر، علاقه‌مندی، پیام، بلاگ، SEO
08-system.prisma      اعلان، Integration، Setting، AuditLog، Import، ImpersonationTicket، DailyStat
```

منبع اتصال دیتابیس در `prisma7.config.ts` است، نه در schema.prisma (قرارداد
Prisma 7 با generator `prisma-client`).

## ⚠️ نکات فنیِ حیاتی برای T-004 (قبل از نوشتن هر Service)

### ۱. Driver Adapter اجباری است

Prisma 7 دیگر query engine باینری پیش‌فرض ندارد. هر `PrismaClient` — چه در
`prisma/seed.ts`، چه در `PrismaService` واقعی T-004 — باید با یک Driver
Adapter ساخته شود:

```ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
```

بدون آن، `PrismaClientInitializationError` می‌گیرید.

### ۲. `Inventory.availableQuantity` را هرگز صریح ست نکنید

در دیتابیس واقعی یک ستون `GENERATED ALWAYS AS ("quantity" - "reservedQuantity")
STORED` است (§۸.۳۱ — «ستون محاسباتی، نه محاسبه در اپلیکیشن»). در
schema.prisma عمداً `Int?` بدون `@default` نوشته شده تا Prisma Client هرگز
مقداری برایش در INSERT/UPDATE نفرستد — هر تلاشی برای نوشتن مستقیم رویش
(حتی با upsert ساده) را Postgres با خطای `428C9` رد می‌کند. اگر بعداً
migration جدیدی برای Inventory نوشتید، **این تعریف دستی را در migration.sql
حفظ کنید** — `prisma migrate dev` خودش نمی‌داند این ستون Generated است.

### ۳. `slug`/`sku` روی چهار موجودیت فقط Partial Unique هستند

`Category.slug`، `Brand.slug`، `Product.slug`، `ProductVariant.sku` — یونیک
واقعی‌شان `WHERE "deletedAt" IS NULL` است (پارشال ایندکس دستی، نه `@unique`
در schema). یعنی Prisma Client این فیلدها را «یکتا» نمی‌شناسد:
`findUnique`/`upsert` با `where: { slug: ... }` **کار نمی‌کند** و
InvalidArgument می‌دهد. باید `findFirst` + create دستی به کار برود (الگوی
`findOrCreateCategory` در `prisma/seed.ts`).

### ۴. AuditLog واقعاً Immutable است

Trigger سطح دیتابیس هر `UPDATE`/`DELETE` روی `AuditLog` را با یک exception
رد می‌کند (§۸.۷۷/۸.۷۸ — «باید در سطح دیتابیس هم محافظت شود»). سرویس Audit در
T-004 فقط باید `create` بزند؛ هر تلاش دیگری خطا می‌گیرد (این عمدی است).

### ۵. پورت محلی Postgres در dev، 5435 است نه 5432

روی ماشین توسعه‌ی این پروژه یک سرویس Postgres سیستمی/محلی از قبل روی 5432
گوش می‌داد و با کانتینر Docker تداخل داشت (خطای احراز هویت گمراه‌کننده‌ای
تولید می‌کرد که در واقع به این تداخل مربوط بود، نه اعتبارنامه). برای اجتناب
از این کلاس تداخل — که رایج است چون 5432 پیش‌فرض استاندارد Postgres است —
`infra/docker/docker-compose.dev.yml` و `.env.example` هر دو روی هاست از
5435 استفاده می‌کنند (پورت داخلی کانتینر همچنان 5432 است).

## تصمیمات تکمیلی سند اصلی (بازتأیید/بازتاب اجرا)

### الف — Order Status نهایی (۹ حالت)

```
PENDING → AWAITING_PAYMENT → PAYMENT_REVIEW → PAID → PROCESSING
  → READY_TO_SHIP → SHIPPED → DELIVERED
(از هر نقطه) → CANCELLED
```

سازگارشده از سه لیست متناقض برند بوک (§۷.۴۸، §۱۱.۵۰، §۲.۳۷). `RETURNED`
عمداً نیست — مرجوعی یک موجودیت جداست (`Return`, §۸.۵۲) چون سفارش می‌تواند
`DELIVERED` باشد و فقط یک قلمش مرجوع شود.

**این enum دقیقاً با `packages/contracts/src/messages/order.ts`'s
`orderStatus` باید یکی بماند** — وقتی این فایل ساخته شد، T-005 قبلاً
اجرا شده بود و enum را (با `paymentReview` اضافه و `returned` حذف) به‌روز
کرد تا با این تصمیم هماهنگ شود.

**جدول گذارهای مجاز (برای T-004 — اینجا Enforce نشده، طبق محدودیت «بدون
منطق کسب‌وکاری» T-003):**

| از               | به‌های مجاز                                                 |
| ---------------- | ----------------------------------------------------------- |
| PENDING          | AWAITING_PAYMENT، CANCELLED                                 |
| AWAITING_PAYMENT | PAYMENT_REVIEW، CANCELLED                                   |
| PAYMENT_REVIEW   | PAID، AWAITING_PAYMENT (رد رسید)، CANCELLED                 |
| PAID             | PROCESSING، CANCELLED                                       |
| PROCESSING       | READY_TO_SHIP، CANCELLED                                    |
| READY_TO_SHIP    | SHIPPED                                                     |
| SHIPPED          | DELIVERED                                                   |
| DELIVERED        | (پایانی — مرجوعی از طریق `Return`، نه تغییر `Order.status`) |
| CANCELLED        | (پایانی)                                                    |

این درسِ سند مقایسه‌ی وایب‌شاپ (بخش ۶) است: `InvalidOrderTransition` باید
در لایه‌ی سرویس Enforce شود، نه فقط در UI.

### ب — Order.status و Payment.status مستقل‌اند

دو enum جدا (`OrderStatus`, `PaymentStatus`)؛ `Order.status` هرگز مستقیم از
پرداخت ست نمی‌شود، سرویس‌لایه آن را از `Payment.status` مشتق/sync می‌کند.
همین استدلال به `Shipment` هم تعمیم داده شد: عمداً فیلد Status جدا ندارد
(SHIPPED/DELIVERED همین حالا در OrderStatus هست؛ سومین منبع یعنی نقض
Single Source of Truth).

### ج — رزرو موجودی

شکل داده آماده است (`Inventory.reservedQuantity`، `InventoryTransaction`
نوع `RESERVATION`/`RELEASE`)؛ منطق واقعی رزرو (در لحظه‌ی ثبت سفارش، TTL
۴۸ساعته، Scheduled Job آزادسازی + `Order.cancelReason = "PAYMENT_TIMEOUT"`)
کار T-004 است.

### د — زنجیره‌ی اولویت سود

```
ProductVariant.profitType/profitValue (اگر ست شده) → Product Override
  ↓ (اگر null)
PriceRule با supplierId ست  → Supplier Rule
  ↓ (اگر نبود)
PriceRule با categoryId ست  → Category Rule
  ↓ (اگر نبود)
PriceRule با هر دو null     → Global Default (دقیقاً یک ردیف، با seed تضمین می‌شود)
```

### ه — سلسله‌مراتب دسته‌بندی

`Category.parentId` self-referencing، عمق نامحدود در دیتابیس؛ UI فعلاً دو
سطح نشان می‌دهد (تصمیم رابط کاربری، نه محدودیت اسکیما).

## الحاقیه‌ی T-003 — اجرا شده

- **ProductVariant**: هر `Product` حداقل یک `ProductVariant` دارد (کد بدون
  شاخه‌ی «دارد/ندارد»). `SKU`/قیمت/موجودی روی واریانت، نه محصول. `Inventory`،
  `InventoryTransaction`، `CartItem`، `OrderItem`، `SupplierProduct`،
  `PriceHistory` همه روی `variantId`. `OrderItem.variantNameSnapshot` نام
  پیکربندی را در لحظه‌ی خرید اسنپ‌شات می‌کند.
- **اقساط**: `ProductVariant.installmentEligible/maxInstallments` +
  `Setting` کلیدهای `installments.*` — فقط شکل داده، بدون منطق محاسبه.
- **انبار مکان‌دار**: `Warehouse` + `Inventory` روی کلید مرکب
  `variantId+warehouseId`. برای لانچ یک `Warehouse` با `isDefault: true`
  (seed می‌سازدش).
- **انتزاع درگاه پرداخت**: `PaymentMethod`/`PaymentProvider` enum +
  `Payment.providerRef`/`providerPayload`. هیچ منطق بله‌پی نوشته نشده.
  ⚠️ اسکراب `providerPayload` از داده‌ی حساس (شماره کارت/CVV/توکن) پیش از
  ذخیره، مسئولیت لایه‌ی سرویس T-004 است.

## فهرست وایب‌شاپ — اجرا شده

- **`HomepageBlock`** — مدیریت محتوای صفحه‌ی اصلی (نوع/ترتیب/تصویر/زمان‌بندی).
- **`ImpersonationTicket`** — بلیت یک‌بارمصرف کوتاه‌عمر؛ عمر واقعی ۶۰ثانیه‌ای
  در سرویس‌لایه‌ی T-004 Enforce می‌شود (اینجا فقط `expiresAt`/`consumedAt`).
  مجوز `users.impersonate` در seed اضافه شده.
- **`DailyStat`** — فقط شکل جدول؛ پرشدنش Scheduled Job فاز بعد است.
- **`SpecificationValue.swatchHex`** — برای مشخصات نوع `COLOR`.
- **`Inventory.lowStockThreshold`** — nullable، override per-ردیف؛ `null`
  یعنی `Setting["inventory.lowStockThreshold"]` (پیش‌فرض سراسری، seed = ۳
  طبق §۷.۳۹) اعمال شود.

## قضاوت‌های T-003 (نقل‌قول مستقیم برند بوک نیستند)

برند بوک بعضی موجودیت‌ها را فقط با فیلد «Status» عمومی توصیف کرده، بدون
مقادیر دقیق. این enumها تصمیم T-003 هستند، مستند شده تا با نقل‌قول قاطی
نشوند:

| Enum              | مقادیر                                        | برند بوک چه گفته                                                               |
| ----------------- | --------------------------------------------- | ------------------------------------------------------------------------------ |
| `ReceiptStatus`   | PENDING/APPROVED/REJECTED                     | §۸.۴۷/۴۸ فقط «Status»، ولی فیلدهای Reviewed By/At/Rejection Reason هم‌خوان‌اند |
| `ReturnStatus`    | REQUESTED/APPROVED/REJECTED/RECEIVED/REFUNDED | §۸.۵۲ فقط «Status» — دقیقاً با `packages/contracts` `returnStatus` یکی         |
| `MessageStatus`   | NEW/READ/REPLIED                              | §۸.۶۴ فقط «Status»                                                             |
| `ImportJobStatus` | PENDING/PROCESSING/COMPLETED/FAILED           | §۸.۷۹ فقط «Status»                                                             |
| `CouponType`      | PERCENT/AMOUNT                                | §۸.۵۷ فقط «Type»                                                               |

و چند تصمیم ساختاری غیر-enum:

- **`Wishlist` = فقط `WishlistItem`** — §۸.۵۶ توصیفش یک رابطه‌ی ساده‌ی
  User↔Product است («یک User نباید بتواند یک Product را چند بار در
  Wishlist قرار دهد»)؛ ظرف جدا (`Wishlist`) بدون نقش اضافه‌ای بود، فقط
  `WishlistItem` (با `@@unique([userId, productId])`) کافی است.
- **`SeoMetadata` یک مدل مشترک با سه مالک اختیاری** (`categoryId`/
  `productId`/`blogPostId`، هر سه `@unique`) — به‌جای تکرار فیلدهای SEO
  روی هر موجودیت (§۸.۶۸: «به‌صورت ساختارمند نگهداری شود»).
- **`MediaAsset` عمومی است، نه اجباری برای همه‌ی تصاویر** — `ProductImage`
  فیلدهای خودش را دارد (§۸.۲۰ صریحاً می‌دهد: url/altText/sortOrder/isPrimary)؛
  `MediaAsset` (§۸.۸۹) برای آپلودهای عمومی‌تر (Import، رسید پرداخت، بلاگ)
  است.
- **دسته‌بندی چندگانه‌ی محصول اجرا نشده** — §۸.۱۸ صریحاً می‌گوید این
  «در صورت نیاز» و آینده است؛ `Product.categoryId` فعلاً تک‌مقداری.
- **`Cart.sessionId`** — برند بوک چیزی درباره‌ی سبد مهمان (پیش از OTP)
  نگفته؛ چون بخش زیادی از مرور پیش از ورود اتفاق می‌افتد، یک `sessionId`
  nullable موازی `userId` nullable اضافه شد (دقیقاً یکی باید ست باشد —
  Enforce در سرویس‌لایه).
- **`Order` آدرس را Snapshot می‌کند** (فیلدهای `shipping*` مستقیم روی
  `Order`، نه فقط `addressId`) — تعمیم منطقی اصل Price Snapshot (§۸.۴۰/۸.۴۴)
  به آدرس: اگر بعداً `UserAddress` ویرایش/حذف شود، سفارش قدیمی نباید عوض شود.
- **`profitValue`/`Coupon.value` روی `Decimal`، نه `BigInt`** — این دو
  فیلد دوگانه‌اند (تومان _یا_ درصد بسته به `profitType`/`type`)؛ `Decimal`
  روی Postgres `NUMERIC` است (دقیق، نه float) پس قاعده‌ی غیرقابل‌مذاکره‌ی
  #۷ («هرگز float») نقض نمی‌شود — فقط این دو فیلد لزوماً `BigInt` خالص
  نیستند چون معنای دوگانه دارند.

## موجودیت‌های §۸.۳ که در برند بوک نامگذاری متفاوتی دارند

برای اطمینان از پوشش کامل («هر موجودیت پارت ۸ یا هست یا دلیل نبودنش
مستند است»):

| نام در §۸.۳           | معادل در اسکیما                                                           |
| --------------------- | ------------------------------------------------------------------------- |
| Address               | `UserAddress`                                                             |
| Product Specification | `SpecificationDefinition` + `SpecificationValue` + `ProductSpecification` |
| Price                 | `PriceRule` + `PriceHistory` + فیلدهای قیمت روی `ProductVariant`          |
| System Setting        | `Setting`                                                                 |
| Payment Receipt       | `PaymentReceipt`                                                          |

هیچ موجودیتی از §۸.۳ حذف نشده.

## Seed (`apps/api/prisma/seed.ts`)

Idempotent (upsert/findFirst-then-create روی هر جا). می‌سازد:

- ~۸۰ مجوز (الگوی `domain.action` طبق §۸.۱۱) + نقش «مدیر ارشد» با همه‌ی
  مجوزها.
- سوپرادمین (`09120000000`) با نقش «مدیر ارشد».
- `Setting`های اقساط + آستانه‌ی سراسری موجودی کم.
- یک `Warehouse` پیش‌فرض («انبار تهران»).
- یک `PriceRule` سراسری (۱۰٪ سود پیش‌فرض).
- ۳ دسته‌بندی (لپ‌تاپ، لپ‌تاپ گیمینگ به‌عنوان زیردسته، کیبورد و موس)، ۳ برند
  (ASUS، Lenovo، Logitech)، ۵ محصول — یکی‌شان (ASUS ROG Strix G16) دو
  پیکربندی RAM/Storage دارد تا مسیر `ProductVariant`/`isVariantAxis` واقعاً
  تمرین شود.

## همزمانی (§۸.۸۳، قاعده‌ی فنی #۳)

`Inventory.version` برای Optimistic Locking آماده است. الگوی مورد انتظار
برای T-004 (اینجا کدی نوشته نشده، طبق محدودیت T-003):

```sql
-- خواندن نسخه‌ی فعلی، سپس:
UPDATE "Inventory"
SET "reservedQuantity" = "reservedQuantity" + $1, version = version + 1
WHERE "variantId" = $2 AND "warehouseId" = $3 AND version = $4
  AND "quantity" - "reservedQuantity" >= $1; -- کافی بودن موجودی
-- اگر ۰ ردیف اثر گرفت: یا موجودی کافی نبود، یا رقیب زودتر برد → retry/fail
```

جایگزین قابل قبول: `SELECT ... FOR UPDATE` در یک تراکنش (بند فنی #۴، §۸.۸۴)
دور کل عملیات ثبت سفارش.
