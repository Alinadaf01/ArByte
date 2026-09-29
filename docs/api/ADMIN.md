# API ادمین (`/api/admin/`) — افزوده‌های آربایت

پایه همان `ADMIN-API-CONTRACT.md` وایب است (camelCase، صفحه‌بندی `{count, results}`، خطای `{detail}` یا `{field: [..]}`). این فایل فقط جاهایی را ثبت می‌کند که مدل آربایت شکل تازه لازم داشت.

## سفارش (F-01)

| مسیر                                                                      | توضیح                                                                                                                                                                                    |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET orders/?search=&status=&readyWithoutSerial=true`                     | جستجو: شماره سفارش یا موبایل گیرنده/حساب؛ ۹ وضعیت                                                                                                                                        |
| `GET orders/:id/`                                                         | به‌علاوه‌ی `items[].units[]` (سریال/شناسه کارت)، `payments[].receipts[]`، `invoiceType` و فیلدهای حقوقی، `shippingMethodName`، `userPhone`، `allowedTransitions`، `missingSerialItemIds` |
| `POST orders/:id/transition/`                                             | `{to, note, provider?, trackingNumber?}` — فقط `allowedTransitions`؛ SHIPPED شرکت و کد رهگیری می‌خواهد                                                                                   |
| `POST orders/:id/serials/`                                                | `{units: [{id, serialNumber}]}` — فقط PAID/PROCESSING                                                                                                                                    |
| `GET orders/:id/{invoice,packing-slip,shipping-label,warranty-cards}.pdf` | چهار سند                                                                                                                                                                                 |

## تنظیمات (F-01)

`settings/site/` + `postalCode`, `testPeriodDays`, `warrantyTerms`, `cardToCardActive`, `cardToCardHolderName|Number|Sheba`. `settings/credentials/` + `maskedCredentials` (فقط `••••`+۴ نویسه‌ی آخر). `POST settings/credentials/test-sms/ {phone}`. `GET|PATCH settings/sms-templates/[:id/]`. `GET settings/sms-logs/?status=&phone=&template=`.

## کاتالوگ (F-02)

| مسیر                                                                       | توضیح                                                                                                                               |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `POST uploads/`                                                            | multipart `file`, `folder` (products/categories/brands/homepage/blog) → `{url}`؛ WebP سمت سرور                                      |
| `brands/`, `brands/:id/`                                                   | CRUD؛ حذف برند دارای محصول → ۴۰۰                                                                                                    |
| `products/?search=&category=&brand=&status=&condition=&stock=in\|out\|low` | فهرست با `priceMin/priceMax/variantsCount/stockAvailable/skus`                                                                      |
| `products/`, `products/:id/`                                               | فیلدهای محصول + `seo {metaTitle, metaDescription, canonical, robots, ogTitle, ogDescription, ogImage}`؛ حذف نرم                     |
| `POST products/:id/images/`                                                | multipart `files[]` + `alts[]` (اجباری)؛ `PATCH                                                                                     | DELETE images/:imageId/` (`altText`, `isPrimary`)؛ `POST images/reorder/ {ids}`                                                                                                                             |
| `GET                                                                       | PUT products/:id/specs/`                                                                                                            | مشخصات سطح محصول (غیرمحور): `{specs: [{definitionId, valueId, customValue}]}`                                                                                                                               |
| `GET                                                                       | PUT products/:id/variants/`                                                                                                         | جدول کامل: `{axes: [defId], rows: [{id?, sku, name, finalPrice, compareAtPrice, stock, isDefault, isPreorder, isActive, axisValues: {defId: valueId}, priceModel…}]}`؛ ردیف حذف‌شده‌ی دارای سفارش → حذف نرم |
| `POST products/:id/variants/preview/`                                      | `{axes, rows}` → `{labels}` (برچسب سمت سرور)                                                                                        |
| `specifications/[:id/]`, `specifications/:id/values/[:valueId/]`           | CRUD تعریف/مقدار (`swatchHex`)؛ محور فقط SELECT/COLOR                                                                               |
| `inventory/`, `PATCH inventory/:variantId/`                                | موجودی/رزرو/قابل فروش/آستانه                                                                                                        |
| `inventory/transactions/`                                                  | کاردکس (`?format=xlsx\|pdf`)؛ `POST {variant, type: STOCK_IN\|STOCK_OUT\|ADJUSTMENT, quantity, note}`                               |
| `inventory/stocktake.pdf`, `pricing/price-list.pdf`                        | اسناد انبار/قیمت                                                                                                                    |
| `pricing/`, `POST pricing/preview/`, `POST pricing/apply/`                 | `{mode: percent\|amount, value, variantIds}` یا `{changes: [{variant, newPrice}]}`؛ گرد به ۱۰۰۰ تومان بالا؛ preview و apply یک منطق |
| `pricing/:variantId/history/`                                              | `PriceHistory`                                                                                                                      |
| `homepage/blocks/[:id/]`, `POST homepage/blocks/reorder/`                  | اعتبارسنجی `config` هر نوع طبق `block-config.ts`                                                                                    |

قیمت همکار/سود واریانت فقط با مجوز `cost_price` خوانده/نوشته می‌شود. بعد از ذخیره‌ی محصول/قیمت/صفحه اصلی، Django اگر `STOREFRONT_URL` و `REVALIDATE_SECRET` ست باشند `POST {STOREFRONT_URL}/api/revalidate` را صدا می‌زند (apps/web).
