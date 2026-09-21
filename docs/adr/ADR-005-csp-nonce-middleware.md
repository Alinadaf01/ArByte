# ADR-005 — CSP با nonce واقعی، نه `script-src 'self'` ثابت

**وضعیت:** رفع شد
**تاریخ:** ۳۰ شهریور ۱۴۰۵ (کشف‌شده حین تأیید زنده‌ی T-100)
**شدت:** بحرانی — از T-000 تا الان، **هیچ کامپوننت کلاینتی در `apps/web` یا `apps/admin` واقعاً هیدریت نمی‌شد.**

---

## باگ

در T-000، هدر امنیتی زیر برای هر دو اپ در `next.config.ts` ثابت تنظیم شده بود (بند ۱۱.۱۰۳ برند بوک):

```
Content-Security-Policy: default-src 'self'; script-src 'self'; ...
```

`script-src 'self'` بدون nonce یا `'unsafe-inline'`، اسکریپت‌های **inline** خودِ Next.js
(bootstrap هیدریشن، `self.__next_f.push(...)` برای جریان RSC) را هم مسدود می‌کند —
نه فقط اسکریپت‌های شخص ثالث. نتیجه: HTML سمت سرور کامل و درست رندر می‌شد، اما
مرورگر هرگز React را روی آن هیدریت نمی‌کرد. هیچ `onClick`، `onChange`، یا
`useState‌`ای کار نمی‌کرد؛ صفحه از نظر بصری کامل به نظر می‌رسید ولی کاملاً
مرده بود. هیچ خطای Console قابل‌مشاهده‌ای هم از طریق ابزار preview این پروژه
دیده نمی‌شد (نقض CSP در این محیط به‌صورت خطای معمولی گزارش نمی‌شود) — این باگ
فقط با بررسی مستقیم DOM (`Object.getOwnPropertyNames` برای کلیدهای
`__reactFiber*`/`__reactProps*`) و مقایسه‌ی رفتار با/بدون CSP کشف شد.

T-001 این باگ را نگرفت چون فقط استایل ایستا (رنگ، فونت، radius) را تأیید کرد،
نه تعامل واقعی. T-100 اولین تسکی بود که کامپوننت تعاملی واقعی (جدول، فرم) ساخت
و تأیید زنده انجام داد.

---

## رفع

### ۱. nonce واقعی per-request به‌جای مقدار ثابت

`middleware.ts` یک nonce تصادفی برای هر درخواست می‌سازد و در هدر CSP می‌گذارد؛
Next.js خودش این nonce را به اسکریپت‌های داخلی‌اش اعمال می‌کند (الگوی رسمی
[مستندات Next.js](https://nextjs.org/docs/app/guides/content-security-policy)):

```
script-src 'self' 'nonce-{random}' 'strict-dynamic'
```

### ۲. محل فایل: داخل `src/`، نه ریشه‌ی اپ

هر دو اپ از ساختار `src/app/` استفاده می‌کنند. Next.js در این حالت **فقط**
`src/middleware.ts` را تشخیص می‌دهد، نه `middleware.ts` در ریشه — این را با
دیدن خط `○ Compiling /middleware ...` در لاگ dev server تأیید کن؛ نبود این خط
یعنی middleware اصلاً اجرا نمی‌شود (بدون خطا، کاملاً بی‌صدا).

### ۳. `'unsafe-eval'` فقط در development

webpack دِوتولِ پیش‌فرض Next.js (`eval-source-map`) برای HMR از `eval()`
استفاده می‌کند. بدون `'unsafe-eval'` در dev، کل باندل کلاینت در همان مرحله‌ی
اول silently شکست می‌خورد — دقیقاً همان علامت باگ اصلی. در production این کد
اصلاً وجود ندارد، پس `'unsafe-eval'` را فقط برای dev اضافه کردیم:

```ts
const scriptSrc =
  process.env.NODE_ENV === "production"
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`;
```

### ۴. `runtime: "nodejs"` در config حذف شد

تلاش اول برای این ADR، `export const config = { runtime: "nodejs" }` را هم
اضافه کرده بود (برای اطمینان از عدم وابستگی به Vercel Edge). این تنظیم بدون
فعال‌سازی فلگ experimental مربوطه باعث می‌شد Next.js کل middleware را بی‌صدا
نادیده بگیرد — همان «بدون خطا، فقط کار نمی‌کند» که این ADR اصلاً قرار بود حلش
کند. حذف شد؛ middleware با Edge Runtime پیش‌فرض خودِ Next.js اجرا می‌شود.

**نکته‌ی مهم درباره‌ی ADR-002:** «Edge Runtime» در اینجا محصول Vercel نیست —
یک محیط اجرای سبک، تعبیه‌شده در خودِ باینری Next.js است که با `next start` روی
هر سرور Node.js (لیارا، Docker خودمیزبان) عین همین‌طور کار می‌کند. آنچه ADR-002
رد کرده «Vercel Edge Middleware» است (محصول مشخص Vercel با قفل زیرساخت آن‌ها)،
نه مکانیزم middleware خودِ فریم‌ورک Next.js.

---

## نحوه‌ی تشخیص این کلاس باگ در آینده

اگر یک کامپوننت کلاینت («use client») به کلیک/تغییر واکنش نشان نداد ولی هیچ
خطای Console‌ای هم نبود:

1. بررسی کن آیا اصلاً هیدریت شده: `Object.getOwnPropertyNames(element)` باید
   کلیدی مثل `__reactFiber$...` داشته باشد. نبودش یعنی هیدریت نشده.
2. هدر CSP واقعی را با `curl -sD - <url>` بررسی کن — اگر `script-src` نه
   `'unsafe-inline'` دارد نه `'nonce-...'`، اسکریپت‌های inline خودِ فریم‌ورک
   مسدودند.
3. اگر middleware داری، مطمئن شو در لاگ dev سرور خط
   `○ Compiling /middleware ...` واقعاً ظاهر می‌شود.

---

## تأثیر روی سایر تصمیمات

- `ADR-002` بدون تغییر — این middleware، Edge Runtime خودِ Next.js است، نه
  محصول Vercel؛ روی هر سرور Node.js (طبق تصمیم ADR-002) کار می‌کند.
- بند ۱۱.۱۰۳ برند بوک (CSP) بدون تغییر باقی می‌ماند — فقط پیاده‌سازی‌اش از
  یک هدر ثابت به nonce واقعی per-request اصلاح شد.
- `T-001` نیازی به بازبینی ندارد — توکن‌ها/استایل درست بودند؛ فقط تعامل
  (که در آن تسک تست نشده بود) شکسته بود.
