import type { MetadataRoute } from "next";

/**
 * E-01 §۱ — آیکون‌های PWA از `scripts/generate-icons.mjs` (از `logo-mark`).
 * `theme_color`/`background_color` عیناً `--color-brand`/`--color-paper`ی
 * `packages/tokens` (اینجا فایل پیکربندی است، نه کامپوننت — قانون ۱ فقط
 * کامپوننت‌ها را منع می‌کند، مثل `tailwind.config`).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "آربایت",
    short_name: "آربایت",
    description: "فروشگاه لپ‌تاپ و سخت‌افزار حرفه‌ای",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F4FC",
    theme_color: "#6C4DFF",
    lang: "fa",
    dir: "rtl",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
