import type { PublicHomepageBlock } from "@arbyte/contracts";
import { StorefrontShell } from "@/components/shell/StorefrontShell";
import { getHomepage } from "@/lib/content";
import { HeroSection } from "@/components/home/HeroSection";
import { CategoryGridSection } from "@/components/home/CategoryGridSection";
import { ProductRailSection } from "@/components/home/ProductRailSection";
import { CampaignSection } from "@/components/home/CampaignSection";
import { BenefitsSection } from "@/components/home/BenefitsSection";
import { BlogRailSection } from "@/components/home/BlogRailSection";

/**
 * T-201 §۲ — ترتیب و فعال‌بودن بخش‌ها از `HomepageBlock` می‌آید (سرور، از
 * قبل مرتب/فیلترشده توسط ContentService بر اساس isActive/startsAt/endsAt)،
 * نه هاردکد اینجا. نوعی که این سوییچ نمی‌شناسد (یا API چیزی برنگرداند)
 * ساکت رد می‌شود — صفحه نباید بشکند.
 */
function renderBlock(block: PublicHomepageBlock) {
  switch (block.type) {
    case "HERO":
      return <HeroSection key={block.id} block={block} />;
    case "CATEGORY_GRID":
      return <CategoryGridSection key={block.id} block={block} />;
    case "PRODUCT_RAIL":
      return <ProductRailSection key={block.id} block={block} />;
    case "CAMPAIGN":
      return <CampaignSection key={block.id} block={block} />;
    case "BENEFITS":
      return <BenefitsSection key={block.id} block={block} />;
    case "BLOG_RAIL":
      return <BlogRailSection key={block.id} block={block} />;
    default:
      return null;
  }
}

export default async function HomePage() {
  const blocks = await getHomepage();

  return (
    <StorefrontShell navActive="home">
      <main>{blocks.map(renderBlock)}</main>
    </StorefrontShell>
  );
}
