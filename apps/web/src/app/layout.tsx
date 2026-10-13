import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { GoogleTagManager } from "@next/third-parties/google";
import { siteFooter } from "@arbyte/contracts";
import "./globals.css";
import { ImpersonationBanner } from "@/components/shell/ImpersonationBanner";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { absoluteUrl, jsonLd } from "@/lib/json-ld";
import { appBaseUrl } from "@/lib/urls";
import { SITE_OPEN_GRAPH } from "@/lib/seo";

export const metadata: Metadata = {
  // بند ۱۰.۷۱ — پایه‌ی canonical/OG مطلق، نه نسبی؛ از env عمومی همان چیزی
  // که T-200 برای همین منظور گذاشته بود (ر.ک. apps/web/.env.example).
  metadataBase: new URL(appBaseUrl()),
  title: "آربایت | فروشگاه لپ‌تاپ و سخت‌افزار",
  description: siteFooter.tagline,
  applicationName: "آربایت",
  // favicon.ico/apple-icon.png/icon.png/opengraph-image.png/manifest.ts —
  // همه با قرارداد نام‌گذاری فایل Next خودکار پیوند می‌شوند (E-01 §۱)؛
  // اینجا فقط چیزی که آن قرارداد نمی‌سازد (زبان/عنوان/توضیح OG).
  // AUDIT-1 B — پیش‌نمایش لینک (تلگرام، واتس‌اپ، X) باید از همین‌جا بیاید.
  // تصویر ۱۲۰۰×۶۳۰ از `opengraph-image.png` (+ alt) با قرارداد فایل Next.
  openGraph: {
    ...SITE_OPEN_GRAPH,
    title: "آربایت | فروشگاه لپ‌تاپ و سخت‌افزار",
    description: siteFooter.tagline,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "آربایت | فروشگاه لپ‌تاپ و سخت‌افزار",
    description: siteFooter.tagline,
  },
};

/** G-02 — بند ۱۰.۷۲ برندبوک: Organization با لوگو در همه‌ی صفحه‌ها. */
const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "آربایت",
  alternateName: "ArByte",
  url: absoluteUrl("/"),
  logo: absoluteUrl("/icon.png"),
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  // ARBYTE-SEO-IMPLEMENTATION.md §1 — فقط GTM را این‌جا بار می‌کنیم؛ تگ/
  // تنظیمات GA4 داخل خودِ workspace گوگل‌تگ‌منیجر ساخته می‌شود (یک‌بار نصب،
  // نه دو نصب مجزای GA4). بدون GTM_ID ردیابی بی‌صدا غیرفعال می‌ماند.
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  // nonce همان چیزی است که middleware برای CSP ساخته — بدون این، اسکریپت
  // GTM توسط script-src (strict-dynamic فقط اسکریپت‌های nonce‌دار را
  // مرجع اعتماد اولیه می‌داند) مسدود می‌شود.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="fa" dir="rtl">
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
      <body>
        {gtmId ? <GoogleTagManager gtmId={gtmId} nonce={nonce} /> : null}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd(organizationLd)}
        />
        <PageViewTracker />
        <ImpersonationBanner />
        {children}
      </body>
    </html>
  );
}
