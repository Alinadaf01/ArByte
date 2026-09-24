import { StorefrontShell } from "@/components/shell/StorefrontShell";
import { getHomepage } from "@/lib/content";
import { HeroSection } from "@/components/home/hero/HeroSection";
import { CategoriesAccordion } from "@/components/home/categories/CategoriesAccordion";
import { FlagshipDuel } from "@/components/home/flagships/FlagshipDuel";
import { FeaturedSection } from "@/components/home/featured/FeaturedSection";
import { JournalSection } from "@/components/home/journal/JournalSection";
import { FaqSection } from "@/components/home/faq/FaqSection";
import { CommunitySection } from "@/components/home/community/CommunitySection";
import { BenefitsSection } from "@/components/home/BenefitsSection";

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
export default async function HomePage() {
  const blocks = await getHomepage();

  const hero = blocks.find((b) => b.type === "HERO");
  const categoryGrid = blocks.find((b) => b.type === "CATEGORY_GRID");
  const flagshipDuel = blocks.find((b) => b.type === "FLAGSHIP_DUEL");
  const productRail = blocks.find((b) => b.type === "PRODUCT_RAIL");
  const benefits = blocks.find((b) => b.type === "BENEFITS");

  return (
    <StorefrontShell navActive="home">
      <main>
        {hero ? <HeroSection block={hero} /> : null}
        {categoryGrid ? <CategoriesAccordion block={categoryGrid} /> : null}
        {flagshipDuel ? <FlagshipDuel block={flagshipDuel} /> : null}
        {productRail ? <FeaturedSection block={productRail} /> : null}
        <JournalSection />
        <FaqSection />
        <CommunitySection />
        {benefits ? <BenefitsSection block={benefits} /> : null}
      </main>
    </StorefrontShell>
  );
}
