# Torob API v3 — خلاصه‌ی پیاده‌سازی

مرجع: `torob-api-v3.pdf` (ذخیره‌شده‌ی صفحه‌ی `panel.torob.com/s/torobApiV3`، ۲۰۲۶-۱۰-۰۵). هر جا این خلاصه با PDF فرق کند، PDF درست است.

- **جهت:** ترب از ما می‌خواند. `POST` با بدنه‌ی `application/json`، و پاسخ هم JSON است.
- **آدرس ما:** `https://api.arbyte.ir/api/torob/v3/products`. این آدرس را خودمان در پنل ترب ثبت می‌کنیم.
- **احراز:** هدر `X-Torob-Token` حاوی JWT است که با کلید خصوصی ترب امضا شده. ما آن را با کلید عمومی ترب بررسی می‌کنیم. کلید و جزئیات در صفحه‌ی جدای `panel.torob.com/s/torob_api_token_guide` است که در ریپو ذخیره نشده.
- **چهار حالت درخواست** (دقیقاً یکی، بدون هیچ پیش‌فرض):
  - `{"page": n, "sort": "date_added_desc" | "date_updated_desc"}`: صفحه‌های ۱۰۰تایی، از صفحه‌ی ۱.
  - `{"sort": "product_id_desc"}` و بعد `{"cursor": "<next_cursor>", "sort": "product_id_desc"}`. در این حالت page/limit/size فرستاده نمی‌شوند و در صفحه‌ی آخر `next_cursor` برابر null است.
  - `{"page_urls": [...]}` / `{"page_uniques": [...]}`: دست‌کم یک عضو. آیتم حذف‌شده یا پنهان اصلاً برگردانده نمی‌شود.
- **پاسخ:** `api_version="torob_api_v3"`، `current_page`، `total`، `max_pages`، `next_cursor`، `products[]`.
- **آیتم** (طول‌ها حداکثر):

  | فیلد                         | قاعده                                   |
  | ---------------------------- | --------------------------------------- |
  | `page_unique`                | ۲۰۰؛ یکتا و برای همیشه ثابت             |
  | `page_url`                   | ۱۵۰۰؛ مطلق                              |
  | `product_group_id`           | ۲۰۰                                     |
  | `title`                      | ۵۰۰                                     |
  | `subtitle`                   | ۵۰۰                                     |
  | `current_price`              | int، هرگز null                          |
  | `old_price`                  | int یا null                             |
  | `availability`               | bool                                    |
  | `category_name`              | ۲۰۰                                     |
  | `image_links`                | مطلق، هر کدام ۱۰۰۰؛ اولی تصویر اصلی است |
  | `short_desc`                 | ۵۰۰                                     |
  | `spec`                       | dict[str, str\|int]، در نبود مقدار `{}` |
  | `guarantee`                  | ۲۰۰                                     |
  | `date_added`, `date_updated` | ISO 8601 با منطقه‌ی زمانی               |

- **خطا:** ورودی نادرست → `400` با `{"error": "..."}`.
- **توصیه‌ی تصویر:** دست‌کم ۹۰۰×۹۰۰ (زیر ۶۰۰×۶۰۰ نمایش داده نمی‌شود) و بدون thumbnail.
