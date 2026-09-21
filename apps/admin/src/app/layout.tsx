import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/layout/AdminShell";
import { estedad } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "ArByte Admin",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={estedad.variable}>
      <head>
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
      <body className="bg-paper text-primary">
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
