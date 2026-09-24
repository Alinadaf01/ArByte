# اندپوینت‌های ادمین موقتاً خاموش — D-02

طبق `01-tasks/batch-02/D-02.md` §۲: اندپوینت‌هایی که شکل محصول/قیمت/مشخصات/موجودی/صفحه اصلی وایب را برمی‌گرداندند، با مدل جدید واریانت‌محور آربایت جور نیستند. **کد حذف نشده** — فقط از `apps/admin_api/urls.py` برداشته شده (و `dashboard.py`، تنها وابسته‌ی زنده به یکی از این فایل‌ها، از `AdminProductSerializer` جدا شد). بازنویسی این پنج فایل روی مدل جدید در `D-08` (بچ ۰۴، ویرایشگر واریانت در صفحه‌ی محصول) است.

## فایل‌ها (دست‌نخورده، فقط بی‌مسیر)

| فایل                          | چرا                                                                                                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/admin_api/products.py`  | `Product.sku`/`price`/`ColorOption` دیگر وجود ندارند — قیمت/SKU روی `ProductVariant` است                                                                    |
| `apps/admin_api/pricing.py`   | ویرایش دسته‌جمعی قیمت روی `Product.price` بود — قیمت الان روی واریانت، منطق سود (`ProductVariant.profit_*`) هم بچ ۰۴                                        |
| `apps/admin_api/specs.py`     | `Attribute`/`AttributeValue`/`ProductAttribute` وایب با `SpecificationDefinition`/`SpecificationValue`/`ProductSpecification` جایگزین شدند (فیلدهای متفاوت) |
| `apps/admin_api/inventory.py` | `StockMovement`/`StockAlert` با `Inventory`/`InventoryTransaction` (روی واریانت، نه محصول) جایگزین شدند                                                     |
| `apps/admin_api/homepage.py`  | `HeroSection`/`HomeShowcase`/`CommunityTile` با `HomepageBlock` جایگزین شدند                                                                                |

## مسیرهای حذف‌شده از `urls.py`

```
admin/homepage/hero/
admin/homepage/showcases/[...]
admin/homepage/community-tiles/[...]
admin/products/                          (لیست/ساخت محصول)
admin/products/price-list.pdf
admin/products/<id>/
admin/products/<id>/images/[...]
admin/products/<id>/colors/[...]         (ColorOption کلاً حذف شد، نه فقط این مسیر)
admin/products/prices/
admin/products/prices/bulk/
admin/products/<id>/price-history/
admin/attributes/[...]
admin/products/<id>/specs/
admin/inventory/[...]
admin/inventory/<id>/alert/
admin/stock-movements/[...]
```

## زنده مانده (بدون تغییر مسیر)

`admin/categories/*` (فقط شکل serializer عوض شد: `image` → `image_main`/`image_banner`/`image_thumbnail`، رشته نه آپلود فایل)، سفارش، کاربر، نقش، پیام، نظر، وبلاگ، کوپن، مرجوعی، تنظیمات، گزارش‌ها (`reports.py` فیلد به فیلد روی `OrderItem.variant`/`unit_price` به‌روز شد)، داشبورد (`dashboard.py` از `products.py` جدا شد؛ خلاصه‌ی محصول الان دیکشنری ساده به‌جای `AdminProductSerializer`)، لاگ فعالیت.

## تست‌های مرتبط

تست‌های این پنج فایل (`test_products.py`، `test_pricing.py`، `test_specs.py`، `test_inventory.py`، و بخش‌های `HomeShowcase`/`HeroSection`/`CommunityTile` در `test_homepage.py`) با `@skip("D-02: admin route disabled, see docs/backend/ADMIN-DISABLED.md")` نشانه‌گذاری شدند — حذف نشدند، چون منطق تستی خودش هنوز معتبر است و در D-08 دوباره فعال می‌شود.

## برای D-08

هر پنج فایل را روی `ProductVariant`/`Inventory`/`SpecificationDefinition`/`HomepageBlock` بازنویسی کنید (نه از صفر — منطق دسترسی/فیلتر/export بیشترشان قابل استفاده است)، مسیرهای بالا را به `urls.py` برگردانید، `@skip` تست‌ها را بردارید.
