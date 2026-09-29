import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  aboutPage,
  formatNumberFa,
  homeCommunity,
  storeFacts,
  toPersianDigits,
} from "@arbyte/contracts";
import { StorefrontShell } from "@/components/shell/StorefrontShell";
import { getAboutContent } from "@/lib/content";

export const revalidate = 60;

export const metadata: Metadata = {
  title: `${aboutPage.breadcrumb.current} | آربایت`,
  description: aboutPage.metaDescription,
  alternates: { canonical: "/about" },
};

const H2 =
  "text-[clamp(22px,2.6vw,32px)] leading-[1.45] font-heading tracking-[-0.025em]";

/**
 * G-01 — About.dc.html. متن هر بخش از پنل (`GET /content/about`)؛ بخش خالی
 * پنهان. آمار فقط از `storeFacts.stats` (null = پنهان)، تیم فقط اگر عضوی
 * تعریف شده باشد.
 */
export default async function AboutPage() {
  const about = await getAboutContent();
  const { stats } = storeFacts;
  const statEntries = (
    [
      ["deliveredOrders", stats.deliveredOrders],
      ["satisfactionPercent", stats.satisfactionPercent],
      ["activeSinceYear", stats.activeSinceYear],
    ] as const
  ).filter((e): e is [(typeof e)[0], number] => e[1] != null);
  const story = about?.story;
  const principles = about?.principles;
  const timeline = about?.timeline;
  const team = about?.team;

  return (
    <StorefrontShell headerActive="about">
      <div dir="rtl" className="bg-paper text-primary font-sans">
        <section className="bg-surface-dark text-on-dark relative overflow-hidden px-[5vw] pt-[clamp(40px,7vh,88px)] pb-[clamp(36px,6vh,72px)]">
          <div
            aria-hidden="true"
            className="bg-glow-violet absolute -top-45 -end-30 h-130 w-130 rounded-full"
          />
          <div
            aria-hidden="true"
            className="bg-glow-cyan absolute -bottom-55 -start-25 h-115 w-115 rounded-full"
          />
          <div className="relative mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(min(290px,100%),1fr))] items-center gap-[clamp(24px,4vw,56px)]">
            <div className="min-w-0">
              <nav
                aria-label="مسیر"
                className="text-on-dark-secondary mb-4.5 flex items-center gap-2 text-caption"
              >
                <Link href="/" className="hover:text-on-dark">
                  {aboutPage.breadcrumb.home}
                </Link>
                <span aria-hidden="true">/</span>
                <span className="text-on-dark font-emphasis">
                  {aboutPage.breadcrumb.current}
                </span>
              </nav>
              <h1 className="max-w-[20ch] text-pretty text-[clamp(28px,3.8vw,50px)] leading-[1.35] font-heading tracking-[-0.03em] text-on-dark">
                {about?.hero.title || aboutPage.breadcrumb.current}
              </h1>
              {about?.hero.body ? (
                <p className="text-on-dark-secondary mt-4 max-w-[56ch] text-[clamp(15px,1.7vw,18px)] leading-loose">
                  {about.hero.body}
                </p>
              ) : null}
            </div>
            <div className="relative aspect-[4/3] min-w-0 overflow-hidden rounded-card-lg border border-white/12 bg-white/5">
              <Image
                src="/about/about-us.webp"
                alt={aboutPage.hero.imageAlt}
                fill
                priority
                sizes="(max-width: 768px) 90vw, 45vw"
                className="object-cover object-center"
              />
            </div>
          </div>
        </section>

        {statEntries.length > 0 ? (
          <section className="border-border bg-surface border-b px-[5vw] py-[clamp(24px,4vh,40px)]">
            <div className="mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[clamp(16px,2.5vw,32px)]">
              {statEntries.map(([key, value]) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <span className="text-[clamp(26px,3vw,36px)] leading-none font-heading tracking-[-0.03em]">
                    {key === "satisfactionPercent"
                      ? `${formatNumberFa(value)}٪`
                      : key === "deliveredOrders"
                        ? `+${formatNumberFa(value)}`
                        : `از ${toPersianDigits(value)}`}
                  </span>
                  <span className="text-secondary text-caption leading-relaxed">
                    {homeCommunity.statLabels[key]}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mx-auto flex max-w-[1240px] flex-col gap-[clamp(28px,5vh,60px)] px-[5vw] py-[clamp(28px,4vh,48px)] pb-[clamp(48px,7vh,80px)]">
          {story && story.paragraphs.length > 0 ? (
            <section className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] items-start gap-[clamp(22px,4vw,56px)]">
              {story.title ? <h2 className={H2}>{story.title}</h2> : <span />}
              <div className="flex max-w-[60ch] flex-col gap-4">
                {story.paragraphs.map((p, i) => (
                  <p
                    key={i}
                    className="text-secondary-2 text-[15.5px] leading-[2.1]"
                  >
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ) : null}

          {principles && principles.items.length > 0 ? (
            <section className="flex flex-col gap-[clamp(16px,2.5vh,24px)]">
              {principles.title ? (
                <h2 className={`${H2} max-w-[52ch]`}>{principles.title}</h2>
              ) : null}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(172px,1fr))] gap-[clamp(14px,2vw,20px)]">
                {principles.items.map((item, i) => (
                  <article
                    key={i}
                    className="border-border bg-surface flex flex-col gap-2.5 rounded-card border p-5.5"
                  >
                    <span
                      dir="ltr"
                      className="text-secondary text-caption font-heading tracking-[0.08em]"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-[16px] leading-relaxed font-heading">
                      {item.title}
                    </h3>
                    {item.body ? (
                      <p className="text-secondary text-caption leading-relaxed">
                        {item.body}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {timeline && timeline.items.length > 0 ? (
            <section className="flex flex-col gap-[clamp(16px,2.5vh,24px)]">
              {timeline.title ? <h2 className={H2}>{timeline.title}</h2> : null}
              <ol className="border-border bg-surface m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(152px,1fr))] overflow-hidden rounded-card border p-0">
                {timeline.items.map((m, i) => (
                  <li
                    key={i}
                    className="border-border-divider flex flex-col gap-2.5 border-e p-5.5 last:border-e-0"
                  >
                    <span className="flex items-center gap-2.5">
                      <i
                        className={`h-2.5 w-2.5 flex-none rounded-full ${i % 3 === 2 ? "bg-accent" : "bg-brand"}`}
                        aria-hidden="true"
                      />
                      <span className="text-[15px] leading-none font-heading tracking-[-0.01em]">
                        {m.year}
                      </span>
                    </span>
                    {m.note ? (
                      <p className="text-secondary text-caption leading-relaxed">
                        {m.note}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {team && team.members.length > 0 ? (
            <section className="flex flex-col gap-[clamp(16px,2.5vh,24px)]">
              <div className="flex flex-wrap items-end justify-between gap-4">
                {team.title ? (
                  <h2 className={`${H2} max-w-[48ch]`}>{team.title}</h2>
                ) : (
                  <span />
                )}
                <Link
                  href="/support"
                  className="text-body font-emphasis whitespace-nowrap"
                >
                  {aboutPage.team.contactCta}
                </Link>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(176px,1fr))] gap-[clamp(14px,2vw,20px)]">
                {team.members.map((member, i) => (
                  <article
                    key={i}
                    className="border-border flex flex-col gap-3 rounded-card border bg-surface p-4"
                  >
                    <span
                      aria-hidden="true"
                      className={`font-heading flex size-12 items-center justify-center rounded-full text-[18px] ${i % 2 ? "bg-brand-tint-3" : "bg-brand-tint-1"} text-brand-active`}
                    >
                      {member.name.trim().charAt(0)}
                    </span>
                    <div className="flex flex-col gap-1">
                      <span className="text-[14.5px] font-heading">
                        {member.name}
                      </span>
                      {member.role ? (
                        <span className="text-secondary text-caption leading-relaxed">
                          {member.role}
                        </span>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="bg-surface-dark relative grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] items-center gap-[clamp(20px,3vw,44px)] overflow-hidden rounded-card-lg p-[clamp(26px,4vw,44px)] text-on-dark">
            <div
              aria-hidden="true"
              className="bg-glow-violet absolute -top-35 -end-22.5 h-95 w-95 rounded-full"
            />
            <div className="relative min-w-0">
              <h2 className="text-on-dark text-[clamp(20px,2.4vw,28px)] leading-relaxed font-heading tracking-[-0.02em]">
                {aboutPage.closingCta.title}
              </h2>
              <p className="text-on-dark-secondary mt-2.5 max-w-[42ch] text-caption leading-relaxed">
                {aboutPage.closingCta.body}
              </p>
            </div>
            <div className="relative flex flex-wrap gap-2.5">
              <Link
                href="/support"
                className="bg-on-dark text-primary hover:bg-brand-tint-1 flex min-h-12 items-center rounded-pill px-6 text-[14.5px] font-emphasis transition-colors duration-250"
              >
                {aboutPage.closingCta.primary}
              </Link>
              <Link
                href="/categories"
                className="text-on-dark hover:border-on-dark flex min-h-12 items-center rounded-pill border border-white/22 px-5.5 text-[14.5px] font-emphasis transition-colors duration-250"
              >
                {aboutPage.closingCta.secondary}
              </Link>
            </div>
          </section>
        </div>
      </div>
    </StorefrontShell>
  );
}
