import localFont from "next/font/local";

/**
 * فونت اصلی فارسی — Estedad (بند ۴.۲۶، ۴.۲۹ برند بوک) — همان فونت apps/web،
 * چون بند ۴.۲۶ آن را فونت اصلی «تمام رابط کاربری فارسی» می‌داند، نه فقط فروشگاه.
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
