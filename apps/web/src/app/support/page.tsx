import type { Metadata } from "next";
import Link from "next/link";
import { storeFacts, supportPage } from "@arbyte/contracts";
import { StorefrontShell } from "@/components/shell/StorefrontShell";
import { SupportContent } from "./SupportContent";
import { getSiteInfo } from "@/lib/content";
import { SITE_OPEN_GRAPH } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = {
  title: `${supportPage.breadcrumb.current} | آربایت`,
  description: supportPage.subtitle,
  alternates: { canonical: "/support" },
  openGraph: {
    ...SITE_OPEN_GRAPH,
    title: `${supportPage.breadcrumb.current} | آربایت`,
    description: supportPage.subtitle,
    url: "/support",
  },
};

export default async function SupportPage() {
  const info = await getSiteInfo();
  return (
    <StorefrontShell headerActive="support">
      <div dir="rtl" className="bg-paper text-primary font-sans">
        <section className="border-border bg-surface border-b px-[5vw] py-[clamp(26px,4vh,42px)] pb-[clamp(20px,3vh,30px)]">
          <div className="mx-auto max-w-[1240px]">
            <nav
              aria-label="مسیر"
              className="text-secondary mb-3.5 flex items-center gap-2 text-caption"
            >
              <Link href="/" className="text-secondary">
                {supportPage.breadcrumb.home}
              </Link>
              <span aria-hidden="true">/</span>
              <span className="text-primary font-emphasis">
                {supportPage.breadcrumb.current}
              </span>
            </nav>
            <div className="flex flex-wrap items-end justify-between gap-4.5">
              <div className="min-w-0">
                <h1 className="text-[clamp(28px,3.4vw,44px)] leading-[1.35] font-heading tracking-[-0.025em]">
                  {supportPage.title}
                </h1>
                <p className="text-secondary mt-2 max-w-[56ch] text-caption leading-relaxed">
                  {supportPage.subtitle}
                </p>
              </div>
            </div>
          </div>
        </section>

        <SupportContent
          phone={info.phone}
          email={info.email}
          businessHours={info.businessHours}
          fallbackHours={storeFacts.support.hours}
        />
      </div>
    </StorefrontShell>
  );
}
