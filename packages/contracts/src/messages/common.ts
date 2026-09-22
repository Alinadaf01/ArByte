/**
 * متن‌های عمومی و مشترک بین صفحات — CTAها (§۲.۱۶)، وضعیت موجودی (§۲.۱۵)،
 * پیام‌های موفقیت عمومی (§۲.۱۷). عبارت‌ها عیناً از برند بوک‌اند؛ بازنویسی یا
 * ترجمه‌ی مجدد ممنوع است (قاعده‌ی غیرقابل‌مذاکره‌ی #۲).
 */

import { toPersianDigits } from "../format/digits";

export const cta = {
  viewProduct: "مشاهده محصول",
  viewSpecs: "مشاهده مشخصات",
  addToCart: "افزودن به سبد",
  checkout: "ثبت سفارش",
  continueOrder: "ادامه سفارش",
  viewOrder: "مشاهده سفارش",
  trackOrder: "پیگیری سفارش",
  addToWishlist: "افزودن به علاقه‌مندی‌ها",
  compareProducts: "مقایسه محصولات",
  viewAllProducts: "مشاهده همه محصولات",
} as const;

export const inventory = {
  inStock: "موجود",
  limitedStock: "موجودی محدود",
  outOfStock: "ناموجود",
  comingSoon: "به‌زودی",
  /** مثال §۲.۱۵: «۳ عدد موجود» — عدد فارسی چون در متن نمایشی عمومی است. */
  exactCount: (count: number) => `${toPersianDigits(count)} عدد موجود`,
} as const;

/**
 * پیام «سفارش ثبت شد» هم‌عبارت §۲.۱۷ و §۲.۲۰ است — طبق اصل یکپارچگی زبان
 * (§۲.۳۸) فقط یک‌بار در order.ts (`orderConfirmation.title`) نگه داشته
 * می‌شود، نه اینجا تکراری.
 */
export const success = {
  infoSaved: "اطلاعات شما با موفقیت ذخیره شد.",
} as const;

/**
 * برچسب‌های عمومی رابط کاربری (T-002) — نه کپی‌ی دامنه‌ای، برای همین از
 * `packages/ui` (Modal/Drawer/Sheet/...) مستقیم import می‌شوند، نه فقط
 * صفحات. قاعده‌ی #۲: حتی این متن‌های عمومی هم نباید داخل کامپوننت hardcode شوند.
 */
export const ui = {
  close: "بستن",
  confirm: "تأیید",
  search: "جستجو...",
  typeToSearch: "برای جستجو تایپ کنید",
  noResults: "نتیجه‌ای پیدا نشد",
} as const;

/**
 * متن صفحه‌ی نمونه‌ی apps/web از T-000/T-001 — نقل‌قول برند بوک نیست (خودِ
 * صفحه هم موقتی است، جای خود را به صفحات واقعی فاز ۲/۳ (T-002 به بعد)
 * می‌دهد). فقط برای رعایت قاعده‌ی #۲ («بدون رشته‌ی فارسی داخل کامپوننت»)
 * تا آن زمان اینجا نگه داشته شده.
 */
export const scaffoldHome = {
  home: {
    title: "آربایت",
    status: "اسکلت پروژه راه‌اندازی شد.",
    cta: "مشاهده‌ی فروشگاه",
  },
} as const;
