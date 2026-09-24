import type { Metadata } from "next";
import { Breadcrumb } from "@arbyte/ui";
import { comparePage } from "@arbyte/contracts";
import { StorefrontShell } from "@/components/shell/StorefrontShell";
import { CompareView } from "@/components/compare/CompareView";
import { getProductBySlug } from "@/lib/catalog";

interface ComparePageProps {
  searchParams: Promise<{ p?: string; diff?: string }>;
}

const MAX_ITEMS = 3;

/** T-215 §۲ — `noindex, follow`. */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const { p, diff } = await searchParams;
  const slugs = (p ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s, i, arr) => arr.indexOf(s) === i)
    .slice(0, MAX_ITEMS);

  const results = await Promise.all(
    slugs.map((slug) => getProductBySlug(slug)),
  );
  const products = results.filter((p_) => p_ !== null);

  return (
    <StorefrontShell headerActive="products" navActive="">
      <section className="border-border border-b bg-surface px-[5vw] py-8 md:py-11">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4">
          <Breadcrumb
            items={[
              { label: comparePage.breadcrumbHome, href: "/" },
              { label: comparePage.breadcrumbShop, href: "/products" },
              { label: comparePage.breadcrumbCurrent },
            ]}
          />
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-hero text-primary font-heading tracking-tight">
                {comparePage.title}
              </h1>
              <p className="text-body text-secondary mt-2 max-w-[56ch]">
                {comparePage.subtitle}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1240px] px-[5vw] py-8 md:py-11">
        <CompareView products={products} diffOnly={diff === "1"} />
      </div>
    </StorefrontShell>
  );
}
