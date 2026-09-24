import Link from "next/link";
import { formatNumberFa, homePage, storeFacts } from "@arbyte/contracts";
import type { PublicHomepageBlock } from "@arbyte/contracts";
import { TRUST_ICON_PATHS as ICON_PATHS } from "@/components/icons/trust-icon-paths";

interface BenefitsSectionProps {
  block: Extract<PublicHomepageBlock, { type: "BENEFITS" }>;
}

/** بند ۲ سند تسک — چهار مزیت ثابت (واقعیت برند)، نه محتوای بلوک تک‌به‌تک. */
export function BenefitsSection({ block }: BenefitsSectionProps) {
  const { benefits } = homePage;
  const freeShippingMillions = formatNumberFa(
    storeFacts.policies.freeShippingMinToman / 1_000_000,
  );
  const returnDays = formatNumberFa(storeFacts.policies.returnDays);

  const items = [
    { key: "warranty", ...benefits.warranty },
    {
      key: "freeShipping",
      title: benefits.freeShipping.title,
      description: benefits.freeShipping.description(freeShippingMillions),
    },
    {
      key: "sevenDayReturn",
      title: benefits.sevenDayReturn.title(returnDays),
      description: benefits.sevenDayReturn.description,
    },
    { key: "testedBeforeShipping", ...benefits.testedBeforeShipping },
  ];

  return (
    <section className="bg-surface border-border border-t px-[5vw] py-10">
      {block.title ? (
        <h2 className="text-h2 text-primary font-heading mb-6 tracking-tight">
          {block.title}
        </h2>
      ) : null}

      <div className="bg-paper border-border mb-5 flex flex-wrap items-center justify-between gap-3 rounded-panel border p-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-brand shrink-0"
            aria-hidden="true"
          >
            {ICON_PATHS["freeShipping"]}
          </svg>
          <p className="text-caption text-primary">
            {homePage.trackOrderBanner.text}
          </p>
        </div>
        <Link
          href="/track-order"
          className="bg-primary text-on-dark hover:bg-brand rounded-pill px-4.5 py-2.5 text-caption font-emphasis whitespace-nowrap transition-colors duration-200"
        >
          {homePage.trackOrderBanner.cta}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.key} className="flex items-start gap-3">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-brand mt-0.5 shrink-0"
              aria-hidden="true"
            >
              {ICON_PATHS[item.key]}
            </svg>
            <div className="flex flex-col gap-1">
              <span className="text-body text-primary font-emphasis">
                {item.title}
              </span>
              <span className="text-caption text-secondary">
                {item.description}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
