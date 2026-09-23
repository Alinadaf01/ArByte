import type { Metadata } from "next";
import type { ReactNode } from "react";
import { estedad } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  // بند ۱۰.۷۱ — پایه‌ی canonical/OG مطلق، نه نسبی؛ از env عمومی همان چیزی
  // که T-200 برای همین منظور گذاشته بود (ر.ک. apps/web/.env.example).
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: "ArByte",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={estedad.variable}>
      <head>
        {/* preload انتخابی فقط ۴۰۰ و ۷۰۰ — بند ۴.۲۹ برند بوک */}
        <link
          rel="preload"
          href="/fonts/estedad/Estedad-400.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/estedad/Estedad-700.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
