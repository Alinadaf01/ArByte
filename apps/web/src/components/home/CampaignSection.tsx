import Image from "next/image";
import Link from "next/link";
import type { PublicHomepageBlock } from "@arbyte/contracts";

interface CampaignSectionProps {
  block: Extract<PublicHomepageBlock, { type: "CAMPAIGN" }>;
}

/**
 * T-150 عمداً رزولوشن غنی کمپین (محصولات کمپین) را به تسک بعدی موکول کرد؛
 * فعلاً فقط محتوای پایه‌ی بلوک (متن/تصویر/CTA) نمایش داده می‌شود.
 */
export function CampaignSection({ block }: CampaignSectionProps) {
  if (!block.title && !block.imageDesktop) return null;

  return (
    <section className="border-border relative overflow-hidden border-t px-[5vw] py-14 md:py-20">
      {block.imageDesktop ? (
        <div className="relative mb-6 aspect-[21/9] w-full overflow-hidden rounded-card-lg">
          <Image
            src={block.imageDesktop}
            alt={block.imageAlt ?? block.title ?? ""}
            fill
            loading="lazy"
            sizes="100vw"
            className="object-cover"
          />
        </div>
      ) : null}
      <div className="flex flex-col items-start gap-3">
        {block.title ? (
          <h2 className="text-h2 text-primary font-heading tracking-tight">
            {block.title}
          </h2>
        ) : null}
        {block.subtitle ? (
          <p className="text-body text-secondary max-w-[60ch]">
            {block.subtitle}
          </p>
        ) : null}
        {block.ctaLabel && block.ctaUrl ? (
          <Link
            href={block.ctaUrl}
            className="bg-brand text-on-dark shadow-button-accent hover:bg-brand-active mt-2 rounded-pill px-6 py-3 text-body font-emphasis transition-colors duration-200"
          >
            {block.ctaLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
