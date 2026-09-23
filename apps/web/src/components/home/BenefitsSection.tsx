import { homePage } from "@arbyte/contracts";
import type { PublicHomepageBlock } from "@arbyte/contracts";

interface BenefitsSectionProps {
  block: Extract<PublicHomepageBlock, { type: "BENEFITS" }>;
}

/** چهار آیکون خطی — عیناً از مسیر SVG بخش Guarantees در Home.dc.html. */
const ICON_PATHS: Record<string, React.ReactNode> = {
  warranty: (
    <>
      <path d="M12 3.2 5 6v5.5c0 4.2 2.9 7.6 7 9.3 4.1-1.7 7-5.1 7-9.3V6Z" />
      <path d="m9.2 12.1 2 2 3.6-3.9" />
    </>
  ),
  freeShipping: (
    <>
      <path d="M2.5 7.5h10v9h-10z" />
      <path d="M12.5 10.5h4l3 3v3h-7z" />
      <circle cx="6.5" cy="17.5" r="1.8" />
      <circle cx="16.5" cy="17.5" r="1.8" />
    </>
  ),
  sevenDayReturn: (
    <>
      <path d="M4 11a8 8 0 1 1 2.3 5.7" />
      <path d="M4 20v-5h5" />
    </>
  ),
  testedBeforeShipping: (
    <>
      <rect x="3" y="4.5" width="18" height="12" rx="2" />
      <path d="M8 20h8" />
      <path d="m9.5 10.3 1.8 1.8 3.2-3.4" />
    </>
  ),
};

/** بند ۲ سند تسک — چهار مزیت ثابت (واقعیت برند)، نه محتوای بلوک تک‌به‌تک. */
export function BenefitsSection({ block }: BenefitsSectionProps) {
  const items = Object.entries(homePage.benefits);

  return (
    <section className="bg-surface border-border border-t px-[5vw] py-10">
      {block.title ? (
        <h2 className="text-h2 text-primary font-heading mb-6 tracking-tight">
          {block.title}
        </h2>
      ) : null}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(([key, item]) => (
          <div key={key} className="flex items-start gap-3">
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
              {ICON_PATHS[key]}
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
