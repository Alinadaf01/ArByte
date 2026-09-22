# ERD — مدل داده‌ی ArByte (T-003)

نمودار زیر همه‌ی ۵۰+ موجودیت اسکیمای `apps/api/prisma/schema/` را با روابطشان
نشان می‌دهد. برای خوانایی فقط فیلدهای کلیدی (PK/FK و چند فیلد کسب‌وکاری مهم)
آمده — لیست کامل فیلدها در خودِ schema.prisma و توضیح تصمیم‌ها در
[data-model.md](./data-model.md) است.

```mermaid
erDiagram
  %% ---------- کاربر و دسترسی ----------
  User ||--o{ UserAddress : "has"
  User ||--o{ UserRole : "has"
  Role ||--o{ UserRole : "has"
  Role ||--o{ RolePermission : "has"
  Permission ||--o{ RolePermission : "has"
  User ||--o{ OtpRequest : "requests"
  User ||--o{ Session : "has"

  User {
    string id PK
    string mobile UK
    enum status
  }
  UserAddress {
    string id PK
    string userId FK
    bool isDefault "پارشال یونیک: یکی per user"
  }
  Role { string id PK; string name UK }
  Permission { string id PK; string key UK }

  %% ---------- کاتالوگ ----------
  Category ||--o{ Category : "parent/children"
  Category ||--o{ Product : "has"
  Brand ||--o{ Product : "has"
  Product ||--o{ ProductVariant : "has (>=1)"
  Product ||--o{ ProductImage : "has"
  Category ||--o{ SpecificationDefinition : "scopes"
  SpecificationDefinition ||--o{ SpecificationValue : "has"
  SpecificationDefinition ||--o{ ProductSpecification : "used by"
  SpecificationValue ||--o{ ProductSpecification : "used by"
  Product ||--o{ ProductSpecification : "shared specs"
  ProductVariant ||--o{ ProductSpecification : "variant-axis specs"

  Product {
    string id PK
    string slug UK "پارشال، WHERE deletedAt IS NULL"
    string categoryId FK
    string brandId FK
    enum condition
    enum status
  }
  ProductVariant {
    string id PK
    string productId FK
    string sku UK "پارشال، WHERE deletedAt IS NULL"
    bigint finalPrice
    bool isDefault
  }
  SpecificationDefinition {
    string id PK
    string key UK
    enum type
    bool isVariantAxis
  }

  %% ---------- قیمت و تأمین‌کننده ----------
  Supplier ||--o{ SupplierProduct : "quotes"
  ProductVariant ||--o{ SupplierProduct : "quoted by"
  Supplier ||--o{ PriceRule : "supplier rule"
  Category ||--o{ PriceRule : "category rule"
  ProductVariant ||--o{ PriceHistory : "logs"

  PriceRule {
    string id PK
    string supplierId FK "null=global"
    string categoryId FK "null=global"
    enum profitType
    decimal profitValue
  }

  %% ---------- موجودی ----------
  ProductVariant ||--o| Inventory : "stocked as"
  ProductVariant ||--o{ InventoryTransaction : "kardex"

  Inventory {
    string variantId PK_FK
    int quantity
    int reservedQuantity
    int availableQuantity "GENERATED ALWAYS AS quantity-reservedQuantity"
    int version "optimistic locking"
  }

  %% ---------- سبد، سفارش، پرداخت، ارسال، مرجوعی ----------
  User ||--o| Cart : "has"
  Cart ||--o{ CartItem : "has"
  ProductVariant ||--o{ CartItem : "in"
  User ||--o{ Order : "places"
  UserAddress ||--o{ Order : "ships to (snapshot)"
  Order ||--o{ OrderItem : "has"
  ProductVariant ||--o{ OrderItem : "purchased as"
  Order ||--o{ OrderStatusHistory : "logs"
  Order ||--o{ Payment : "has"
  Payment ||--o{ PaymentReceipt : "has"
  Order ||--o| Shipment : "has"
  Order ||--o{ Return : "has"
  Return ||--o{ ReturnItem : "covers"
  OrderItem ||--o{ ReturnItem : "returned via"

  Order {
    string id PK
    string orderNumber UK "ARB-YYYY-NNNNNN"
    string userId FK
    enum status "PENDING..CANCELLED، بدون RETURNED"
    enum paymentStatus "مستقل از status"
  }
  OrderItem {
    string id PK
    string orderId FK
    string variantId FK "nullable — snapshot کافی است"
    string productNameSnapshot
    string skuSnapshot
    json specSnapshot
  }
  Payment {
    string id PK
    string orderId FK
    enum method "MANUAL_CARD_TO_CARD|GATEWAY"
    enum provider "NONE|BALEPAY"
    json providerPayload "اسکراب‌شده"
  }

  %% ---------- تخفیف و بازاریابی ----------
  Coupon ||--o{ CouponUsage : "used"
  User ||--o{ CouponUsage : "used by"
  Order ||--o{ CouponUsage : "on"
  Campaign ||--o{ CampaignProduct : "targets"
  Product ||--o{ CampaignProduct : "targeted"
  Category ||--o{ CampaignProduct : "targeted"

  %% ---------- محتوا ----------
  User ||--o{ Review : "writes"
  Product ||--o{ Review : "reviewed"
  Order ||--o{ Review : "verified via"
  User ||--o{ WishlistItem : "saves"
  Product ||--o{ WishlistItem : "saved"
  ProductVariant ||--o{ WishlistItem : "saved config"
  BlogCategory ||--o{ BlogPost : "has"
  User ||--o{ BlogPost : "authors"
  Category ||--o| SeoMetadata : "has"
  Product ||--o| SeoMetadata : "has"
  BlogPost ||--o| SeoMetadata : "has"

  %% ---------- سیستم ----------
  User ||--o{ Notification : "receives"
  User ||--o{ AuditLog : "acts (immutable — trigger)"
  User ||--o{ ImportJob : "runs"
  ImportJob ||--o{ ImportJobRow : "has"
  User ||--o{ ImpersonationTicket : "admin/customer"
```

## نکات خارج از قابلیت Mermaid/Prisma DSL

این‌ها در نمودار بالا به‌صورت متنی اشاره شده‌اند، چون Mermaid/Prisma راه
استانداردی برای نمایش‌شان ندارند — جزئیات در data-model.md:

- **۴ Partial Unique Index** (`slug`/`sku` با `WHERE "deletedAt" IS NULL`) —
  `Category`, `Brand`, `Product`, `ProductVariant`.
- **۱ Partial Unique Index دیگر** — `UserAddress` (`WHERE "isDefault" = true`).
- **AuditLog Trigger** — `BEFORE UPDATE/DELETE` رد می‌شود (immutability در سطح DB).
- **`Inventory.availableQuantity`** — `GENERATED ALWAYS AS ... STORED`، نه یک
  ستون معمولی.
