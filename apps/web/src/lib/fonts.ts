import localFont from "next/font/local";

/**
 * فونت اصلی فارسی — Estedad (بند ۴.۲۶، ۴.۲۹ برند بوک).
 * فقط وزن‌های ۴۰۰/۵۰۰/۶۰۰/۷۰۰. خودمیزبان چون Google Fonts از ایران در دسترس نیست.
 * preload این‌جا false است چون next/font نمی‌تواند فقط بخشی از وزن‌های یک src array را
 * preload کند — preload انتخابی ۴۰۰ و ۷۰۰ با <link rel="preload"> دستی در RootLayout انجام می‌شود.
 */
export const estedad = localFont({
  src: [
    {
      path: "../../public/fonts/estedad/Estedad-400.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/estedad/Estedad-500.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/estedad/Estedad-600.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/estedad/Estedad-700.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-estedad",
  display: "swap",
  preload: false,
});
