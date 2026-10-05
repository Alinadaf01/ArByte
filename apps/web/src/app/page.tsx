import type { Metadata } from "next";
import { siteFooter } from "@arbyte/contracts";
import { StorefrontShell } from "@/components/shell/StorefrontShell";
import { absoluteUrl, jsonLd } from "@/lib/json-ld";
import { getBlogPosts, getFaq, getHomepage, getSiteInfo } from "@/lib/content";
import { toJournalCards } from "@/content/home-journal";
import { HeroSection } from "@/components/home/hero/HeroSection";
import { CategoriesAccordion } from "@/components/home/categories/CategoriesAccordion";
import { FlagshipDuel } from "@/components/home/flagships/FlagshipDuel";
import { FeaturedSection } from "@/components/home/featured/FeaturedSection";
import { JournalSection } from "@/components/home/journal/JournalSection";
import { FaqSection } from "@/components/home/faq/FaqSection";
import { CommunitySection } from "@/components/home/community/CommunitySection";
import { BenefitsSection } from "@/components/home/BenefitsSection";
import { SITE_OPEN_GRAPH } from "@/lib/seo";

/**
 * T-211/T-212 — ترتیب بخش‌ها عیناً `Home.dc.html` است: Hero → Categories →
 * Flagships → Featured → Journal → FAQ → Community → Guarantees. این
 * ترتیب خودِ فایل طراحی است، نه `sortOrder` یک بلوک عمومی — برای همین هر
 * بلوک را جدا با نوعش پیدا می‌کنیم (نه `blocks.map()` روی کل آرایه)؛
 * Journal/FAQ/Community اصلاً بلوک CMS نیستند (طبق §۲/۳/۴ سند T-212، محتوا
 * محلی یا مشتق از `storeFacts` است)، پس بین بلوک‌های PRODUCT_RAIL و
 * BENEFITS رندر می‌شوند نه بعد از کل آرایه. بلوکی که پیدا نشود ساکت رد
 * می‌شود — صفحه نمی‌شکند.
 */
export const metadata: Metadata = {
  title: "آربایت | فروشگاه لپ‌تاپ و سخت‌افزار تست‌شده",
  description: siteFooter.tagline,
  alternates: { canonical: "/" },
  openGraph: {
    ...SITE_OPEN_GRAPH,
    title: "آربایت | فروشگاه لپ‌تاپ و سخت‌افزار تست‌شده",
    description: siteFooter.tagline,
    url: "/",
  },
};

/** G-02 — WebSite + SearchAction (جعبه‌ی جستجوی نتایج گوگل). */
const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "آربایت",
  url: absoluteUrl("/"),
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${absoluteUrl("/search")}?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default async function HomePage() {
  // getSiteInfo همان fetch کش‌شده‌ی StorefrontShell است (dedupe در همین رندر).
  const [blocks, journal, siteInfo, faq] = await Promise.all([
    getHomepage(),
    getBlogPosts({ perPage: 9 }),
    getSiteInfo(),
    getFaq(),
  ]);

  const hero = blocks.find((b) => b.type === "HERO");
  const categoryGrid = blocks.find((b) => b.type === "CATEGORY_GRID");
  const flagshipDuel = blocks.find((b) => b.type === "FLAGSHIP_DUEL");
  const productRail = blocks.find((b) => b.type === "PRODUCT_RAIL");
  const benefits = blocks.find((b) => b.type === "BENEFITS");

  return (
    <StorefrontShell navActive="home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(websiteLd)}
      />
      <main>
        {hero ? <HeroSection block={hero} /> : null}
        {categoryGrid ? <CategoriesAccordion block={categoryGrid} /> : null}
        {flagshipDuel ? <FlagshipDuel block={flagshipDuel} /> : null}
        {productRail ? <FeaturedSection block={productRail} /> : null}
        <JournalSection cards={toJournalCards(journal.items)} />
        {faq.some((item) => item.onHome) ? (
          <FaqSection info={siteInfo} items={faq} />
        ) : null}
        <CommunitySection />
        {benefits ? <BenefitsSection block={benefits} /> : null}
      </main>
    </StorefrontShell>
  );
}
