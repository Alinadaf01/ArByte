import type { PublicHomepageBlock } from "@arbyte/contracts";
import { StorefrontShell } from "@/components/shell/StorefrontShell";
import { getHomepage } from "@/lib/content";
import { HeroSection } from "@/components/home/hero/HeroSection";
import { CategoriesAccordion } from "@/components/home/categories/CategoriesAccordion";
import { FlagshipDuel } from "@/components/home/flagships/FlagshipDuel";

/**
 * T-211 §۰ — صفحه از روی ساختار واقعی `Home.dc.html` بازنویسی شد، نه فهرست
 * بخش‌های برندبوک (اشتباه T-201). این تسک فقط سه بخش اول را می‌سازد؛
 * بقیه (Featured/Journal/FAQ/Community/Guarantees) عمداً برای T-212 خالی
 * می‌ماند — بلوکی که این سوییچ نمی‌شناسد ساکت رد می‌شود، صفحه نمی‌شکند.
 */
function renderBlock(block: PublicHomepageBlock) {
  switch (block.type) {
    case "HERO":
      return <HeroSection key={block.id} block={block} />;
    case "CATEGORY_GRID":
      return <CategoriesAccordion key={block.id} block={block} />;
    case "FLAGSHIP_DUEL":
      return <FlagshipDuel key={block.id} block={block} />;
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
