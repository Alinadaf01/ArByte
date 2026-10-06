import type { PublicHomepageBlock } from "@arbyte/contracts";
import { Hero } from "./Hero";

interface HeroSectionProps {
  block: Extract<PublicHomepageBlock, { type: "HERO" }>;
}

/**
 * پوسته‌ی سروری هیرو — فقط دروازه‌ی روشن/خاموش از پنل (بلوک HERO فعال
 * باشد یا نه). محتوای واقعی در `Hero.tsx` است و دیگر به `block.config`
 * (مانیفست ویدیو) نیازی ندارد.
 */
export function HeroSection(_props: HeroSectionProps) {
  return <Hero />;
}
