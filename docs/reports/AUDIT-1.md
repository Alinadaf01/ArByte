# AUDIT-1 — P0: درستی تولید

وضعیت: ✅ کد کامل. B به اقدام مالک در Cloudflare نیاز دارد. سایت زنده از این محیط در دسترس نبود (proxy خروجی `arbyte.ir` و `api.arbyte.ir` را می‌بندد)، پس همه‌چیز از روی کد و تست بررسی شد.

## B — پیش‌نمایش لینک ERP روی arbyte.ir (ریشه پیدا شد)

متن «سیستم مدیریت کارخانه تشک» در `erp-milad/src/routes/__root.tsx` است. در `erp-milad/wrangler.jsonc` این دو خط هست:

```
{ "pattern": "arbyte.ir", "custom_domain": true },
{ "pattern": "www.arbyte.ir", "custom_domain": true }
```

یعنی هر `wrangler deploy` پروژه‌ی ERP این دو دامنه را به‌عنوان Custom Domain به Worker خودش (`tanstack-start-app`) می‌چسباند. Custom Domain در Cloudflare از رکورد DNS و Vercel جلوتر است. کد ArByte مشکلی نداشت.

**کارهای مالک (به ترتیب):**

1. Cloudflare → Workers & Pages → `tanstack-start-app` → Settings → Domains & Routes → `arbyte.ir` و `www.arbyte.ir` را **Remove** کنید.
2. در ریپوی `erp-milad`، `routes` فایل `wrangler.jsonc` را به دامنه‌ی خود ERP (`wegalerp.ir`) تغییر دهید یا حذف کنید؛ وگرنه deploy بعدی دوباره دامنه را می‌گیرد. (این session به آن ریپو فقط دسترسی خواندن دارد.)
3. Cloudflare → DNS: رکوردهای `@` و `www` را دقیقاً مطابق مقادیر Vercel → پروژه‌ی ArByte → Settings → Domains بسازید، با **DNS only** (ابر خاکستری). در Vercel هر دو دامنه باید روی همین پروژه «Valid» باشند.
4. بررسی: `curl -sA "TelegramBot (like TwitterBot)" https://arbyte.ir | grep -o 'og:title" content="[^"]*'` باید «آربایت | …» بدهد؛ همین را برای `www` هم بزنید.
5. کش تلگرام: آدرس را برای **@WebpageBot** بفرستید (هر دو دامنه).

**در کد:** `og:site_name` و `og:locale` فقط در layout بودند و چون Next `openGraph` هر صفحه را کامل جایگزین می‌کند، در صفحه‌ی اصلی و همه‌ی صفحه‌ها گم می‌شدند. حالا پایه‌ی مشترک `lib/seo.ts` را دارند. `og:url` و عنوان/توضیح twitter اضافه شد، تصویر twitter (۱۲۰۰×۶۳۰) با alt آمد و `metadataBase` از منبع واحد آدرس خوانده می‌شود.

## §11 — رسید در پنل دیده نمی‌شد (سه باگ واقعی)

1. **۴۰۳ برای همه به‌جز سوپریوزر:** endpointهای رسید `require_section("payments")` داشتند، ولی بخش `payments` در `sections.py` وجود ندارد؛ پس هیچ نقشی، حتی «مدیر کل»، مجوزش را نداشت. حالا دیدن = `orders.view` و تأیید/رد = `orders.edit`، بدون migration.
2. **فهرست پرداخت‌ها و رسیدها همیشه ۵۰۰ می‌داد:** `source=` تکراری در سریالایزر (AssertionError از DRF).
3. **پنجره باز نمی‌شد:** `window.open` بعد از `await` بی‌صدا به‌عنوان popup مسدود می‌شد. حالا پیش‌نمایش داخل پنل است: تصویر inline، و PDF با لینک مستقیم.

فایل حالا Content-Type را از محتوای واقعی می‌گیرد، با `inline`، `private, no-store` و `nosniff` سرو می‌شود و نام فایل حدس‌پذیر ندارد. تست انتها‌به‌انتها با بایت واقعی پوشش داده شده: آپلود مشتری → جزئیات سفارش در پنل → فایل → تأیید → PAID. همین‌طور دسترسی ناشناس، مشتری دیگر، ادمین بدون بخش و مسیر `/media` عمومی همگی رد می‌شوند.

## §12.5–12.7 — ۵۰۰ کاتالوگ

- **بازتولید شد:** جستجو برای محصولی بدون واریانت با `IndexError` به ۵۰۰ می‌رسید. قانون واحد `PUBLIC_PRODUCT_Q` (دست‌کم یک واریانت زنده) حالا روی فهرست، جستجو، جزئیات، صفحه‌ی اصلی، شمارش دسته‌ها، sitemap و ترب اعمال می‌شود.
- **برند null:** در دیتابیس ممکن نیست (`NOT NULL` + `PROTECT`). تست نشان می‌دهد برند حذف‌شده یا غیرفعال هم جستجو را نمی‌شکند.
- **تصویر:** `public_media_url` آدرس خالی را `None` و آدرس مطلق دامنه‌ی خودمان را نسبی می‌کند. پس next/image هرگز `src` خالی نمی‌گیرد (محصول، دسته، وبلاگ). همه‌ی renderهای فروشگاه از قبل `null` را چک می‌کردند.

## §12.8 — نرمال‌سازی آدرس

Codex گارد تولید را در ۵ فایل تکرار کرده بود. حالا فقط `apps/web/src/lib/urls.ts` این کارها را انجام می‌دهد: نرمال‌سازی (بدون `//`، بدون اسلش انتهایی)، `joinUrl`، fallback به localhost فقط بیرون از production، و گارد Vercel. همه‌ی مصرف‌کننده‌ها به آن وصل شدند: RSC، BFF، middleware، `next.config`، sitemap، JSON-LD.

## §12.9 — timeout در BFF

**ریشه:** middleware روی هر صفحه، هر بار که کش نمونه‌ی Edge سرد بود، منتظر `GET /seo/redirects` از ایران می‌ماند، و هیچ fetch بالادستی timeout نداشت. اتصال کند Vercel ↔ ایران درخواست را تا سقف Vercel معلق نگه می‌داشت.

**رفع، بدون دور زدن BFF:**

- middleware جدول کهنه را فوراً استفاده و در پس‌زمینه تازه می‌کند؛ نمونه‌ی سرد حداکثر ۱٫۵ ثانیه صبر می‌کند.
- `fetchWithTimeout`: ۸ ثانیه برای RSC و ۱۵ ثانیه برای BFF.
- BFF به‌جای معلق‌ماندن 504/502 با قالب خطای API برمی‌گرداند.

**پیشنهاد (Q-47):** region توابع Vercel روی `fra1` (نزدیک‌ترین به ایران) باشد. این تنظیم پروژه است و تغییر داده نشد.

## آزمون

- Django: **۴۶۰ تست سبز**؛ ruff تمیز؛ migration تازه ندارد.
- web: ۱۰۹ تست سبز (+۹ برای urls و timeout).
- typecheck کل workspace و lint (۰ خطا) سبز.
- `next build` با env تولیدی سبز؛ host اشتباه build را متوقف می‌کند.

## باز

- اتصال سرور Bale به `api.arbyte.ir` (C) مربوط به session ۲ است.
- دسترسی VPS/Vercel برای این session لازم نشد؛ برای اندازه‌گیری‌های session ۴ (TTFB و LCP زنده) مفید است.
