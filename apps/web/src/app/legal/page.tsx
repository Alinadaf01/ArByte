import type { Metadata } from "next";
import Link from "next/link";
import { legalPage } from "@arbyte/contracts";
import { StorefrontShell } from "@/components/shell/StorefrontShell";
import { LegalContent } from "./LegalContent";
import { getLegalDocuments } from "@/lib/content";

export const revalidate = 300;

export const metadata: Metadata = {
  title: `${legalPage.breadcrumb.current} | آربایت`,
  description: legalPage.subtitle,
  alternates: { canonical: "/legal" },
  openGraph: {
    title: `${legalPage.breadcrumb.current} | آربایت`,
    description: legalPage.subtitle,
    url: "/legal",
  },
};

export default async function LegalPage() {
  const documents = await getLegalDocuments();
  return (
    <StorefrontShell>
      <div dir="rtl" className="bg-paper text-primary font-sans">
        <section className="border-border bg-surface border-b px-[5vw] py-[clamp(26px,4vh,42px)] pb-[clamp(20px,3vh,30px)]">
          <div className="mx-auto max-w-[1240px]">
            <nav
              aria-label="مسیر"
              className="text-secondary mb-3.5 flex items-center gap-2 text-caption"
            >
              <Link href="/" className="text-secondary">
                {legalPage.breadcrumb.home}
              </Link>
              <span aria-hidden="true">/</span>
              <span className="text-primary font-emphasis">
                {legalPage.breadcrumb.current}
              </span>
            </nav>
            <h1 className="text-[clamp(28px,3.4vw,44px)] leading-[1.35] font-heading tracking-[-0.025em]">
              {legalPage.title}
            </h1>
            <p className="text-secondary mt-2 max-w-[56ch] text-caption leading-relaxed">
              {legalPage.subtitle}
            </p>
          </div>
        </section>

        <LegalContent documents={documents} />
      </div>
    </StorefrontShell>
  );
}
