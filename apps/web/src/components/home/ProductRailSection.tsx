import { homePage } from "@arbyte/contracts";
import type { PublicHomepageBlock } from "@arbyte/contracts";
import { ProductCard } from "@/components/product/ProductCard";

interface ProductRailSectionProps {
  block: Extract<PublicHomepageBlock, { type: "PRODUCT_RAIL" }>;
}

/** ریل افقی قابل‌اسکرول — بند ۶ سند تسک («اسکرول ریل‌ها» جزو تأیید تعاملی است. */
export function ProductRailSection({ block }: ProductRailSectionProps) {
  if (block.products.length === 0) return null;

  return (
    <section className="bg-paper border-border border-t px-[5vw] py-14 md:py-20">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <h2 className="text-h2 text-primary font-heading tracking-tight">
          {block.title ?? homePage.featuredTitle}
        </h2>
      </div>

      <div className="scrollbar-none -mx-[5vw] flex snap-x snap-mandatory gap-4 overflow-x-auto px-[5vw] pb-2">
        {block.products.map((product) => (
          <div
            key={product.id}
            className="w-[78vw] shrink-0 snap-start sm:w-[340px]"
          >
            <ProductCard
              product={product}
              imageSizes="(max-width: 640px) 78vw, 340px"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
