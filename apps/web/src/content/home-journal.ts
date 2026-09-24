/**
 * T-212 §۲ — کارت‌های «پیش از خرید، بخوانید»، عیناً از `Home.dc.html`
 * (بلاگ آربایت هنوز API ندارد؛ وقتی ساخته شود فقط منبع داده عوض می‌شود،
 * کامپوننت نباید بداند از کجا می‌آید — ر.ک. کامنت `JournalSection.tsx`).
 *
 * ⚠️ دو مورد (`headphones-under-10m`, `second-monitor`) متن نمونه‌ی
 * طراحی‌اند درباره‌ی هدفون و مانیتور — چیزی که آربایت نمی‌فروشد. حذف یا
 * جایگزینی‌شان تصمیم محتوایی است، نه فنی؛ در `docs/QUESTIONS.md` ثبت شد،
 * فعلاً عیناً نگه داشته شدند (§۶ سند تسک: «هیچ آمار/ادعای ساختگی» درباره‌ی
 * سیاست‌هاست، نه محتوای بلاگ نمونه که با ساخت بلاگ واقعی جایگزین می‌شود).
 */
export type JournalVariant = "violet" | "dark" | "cyan";

export interface JournalCardData {
  slug: string;
  tag: string;
  title: string;
  readMinutes: number;
  variant: JournalVariant;
}

export const homeJournalCards: JournalCardData[] = [
  {
    slug: "how-to-choose-a-laptop",
    tag: "راهنمای خرید",
    title: "چطور لپ‌تاپ درست را انتخاب کنیم",
    readMinutes: 7,
    variant: "violet",
  },
  {
    slug: "titan-18-hx-real-work",
    tag: "بررسی",
    title: "Titan 18 HX در کار واقعی",
    readMinutes: 9,
    variant: "dark",
  },
  {
    slug: "mini-led-vs-oled",
    tag: "مقایسه",
    title: "Mini LED یا OLED؟",
    readMinutes: 6,
    variant: "cyan",
  },
  {
    slug: "ram-and-ssd-how-much",
    tag: "راهنمای خرید",
    title: "رم و SSD؛ چقدر کافی است",
    readMinutes: 5,
    variant: "violet",
  },
  {
    slug: "battery-care",
    tag: "نگهداری",
    title: "باتری را چطور زنده نگه داریم",
    readMinutes: 4,
    variant: "dark",
  },
  {
    slug: "headphones-under-10m",
    tag: "بررسی",
    title: "هدفون‌های بی‌سیم زیر ده میلیون",
    readMinutes: 8,
    variant: "cyan",
  },
  {
    slug: "240hz-settings",
    tag: "گیمینگ",
    title: "تنظیمات درست برای ۲۴۰ هرتز",
    readMinutes: 6,
    variant: "violet",
  },
  {
    slug: "second-monitor",
    tag: "راهنمای خرید",
    title: "مانیتور دوم برای کار",
    readMinutes: 5,
    variant: "dark",
  },
  {
    slug: "arbyte-pre-ship-testing",
    tag: "پشت صحنه",
    title: "تست آربایت پیش از ارسال",
    readMinutes: 3,
    variant: "cyan",
  },
];
