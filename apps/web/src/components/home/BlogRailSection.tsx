import { EmptyState } from "@arbyte/ui";
import { homePage } from "@arbyte/contracts";
import type { PublicHomepageBlock } from "@arbyte/contracts";

interface BlogRailSectionProps {
  block: Extract<PublicHomepageBlock, { type: "BLOG_RAIL" }>;
}

/**
 * T-201 §۲ — API وبلاگ هنوز نیست؛ این بخش فقط وقتی بلوک BLOG_RAIL از
 * `/content/homepage` فعال برگردد رندر می‌شود (نه هاردکد)، اما چون هیچ
 * فهرست پستی از API نمی‌آید، همیشه حالت خالی نشان می‌دهد — در `T-207` که
 * API وبلاگ وصل شود، اینجا فهرست واقعی پست‌ها جایگزین EmptyState می‌شود.
 */
export function BlogRailSection({ block }: BlogRailSectionProps) {
  return (
    <section className="bg-paper border-border border-t px-[5vw] py-14 md:py-20">
      <h2 className="text-h2 text-primary font-heading mb-6 tracking-tight">
        {block.title ?? homePage.blog.title}
      </h2>
      <EmptyState
        title={homePage.blog.emptyTitle}
        description={homePage.blog.emptyDescription}
      />
    </section>
  );
}
