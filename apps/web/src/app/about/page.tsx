import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { aboutPage } from "@arbyte/contracts";
import { StorefrontShell } from "@/components/shell/StorefrontShell";
import { ImageSlot } from "@/components/ImageSlot";

export const metadata: Metadata = {
  title: `${aboutPage.breadcrumb.current} | آربایت`,
};

const dotColor = { brand: "bg-brand", accent: "bg-accent" } as const;

export default function AboutPage() {
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
          <div className="relative mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(290px,1fr))] items-center gap-[clamp(24px,4vw,56px)]">
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
                {aboutPage.hero.title}
              </h1>
              <p className="text-on-dark-secondary mt-4 max-w-[56ch] text-[clamp(15px,1.7vw,18px)] leading-loose">
                {aboutPage.hero.body}
              </p>
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

        <section className="border-border bg-surface border-b px-[5vw] py-[clamp(24px,4vh,40px)]">
          <div className="mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[clamp(16px,2.5vw,32px)]">
            {aboutPage.stats.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1.5">
                <span className="text-[clamp(26px,3vw,36px)] leading-none font-heading tracking-[-0.03em]">
                  {stat.value}
                </span>
                <span className="text-secondary text-caption leading-relaxed">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="mx-auto flex max-w-[1240px] flex-col gap-[clamp(28px,5vh,60px)] px-[5vw] py-[clamp(28px,4vh,48px)] pb-[clamp(48px,7vh,80px)]">
          <section className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] items-start gap-[clamp(22px,4vw,56px)]">
            <h2 className="text-[clamp(22px,2.6vw,32px)] leading-[1.45] font-heading tracking-[-0.025em]">
              {aboutPage.story.title}
            </h2>
            <div className="flex max-w-[60ch] flex-col gap-4">
              {aboutPage.story.paragraphs.map((p) => (
                <p
                  key={p}
                  className="text-secondary-2 text-[15.5px] leading-[2.1]"
                >
                  {p}
                </p>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-[clamp(16px,2.5vh,24px)]">
            <div className="max-w-[52ch]">
              <h2 className="text-[clamp(22px,2.6vw,32px)] leading-[1.45] font-heading tracking-[-0.025em]">
                {aboutPage.principles.title}
              </h2>
              <p className="text-secondary mt-2.5 text-caption leading-relaxed">
                {aboutPage.principles.subtitle}
              </p>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(172px,1fr))] gap-[clamp(14px,2vw,20px)]">
              {aboutPage.principles.items.map((item) => (
                <article
                  key={item.num}
                  className="border-border bg-surface flex flex-col gap-2.5 rounded-card border p-5.5"
                >
                  <span
                    dir="ltr"
                    className="text-secondary text-caption font-heading tracking-[0.08em]"
                  >
                    {item.num}
                  </span>
                  <h3 className="text-[16px] leading-relaxed font-heading">
                    {item.title}
                  </h3>
                  <p className="text-secondary text-caption leading-relaxed">
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-[clamp(16px,2.5vh,24px)]">
            <h2 className="text-[clamp(22px,2.6vw,32px)] leading-[1.45] font-heading tracking-[-0.025em]">
              {aboutPage.timeline.title}
            </h2>
            <div className="border-border bg-surface grid grid-cols-[repeat(auto-fit,minmax(152px,1fr))] overflow-hidden rounded-card border">
              {aboutPage.timeline.milestones.map((m) => (
                <div
                  key={m.year}
                  className="border-border-divider flex flex-col gap-2.5 border-e p-5.5 last:border-e-0"
                >
                  <span className="flex items-center gap-2.5">
                    <i
                      className={`h-2.5 w-2.5 flex-none rounded-full ${dotColor[m.dot]}`}
                      aria-hidden="true"
                    />
                    <span className="text-[15px] leading-none font-heading tracking-[-0.01em]">
                      {m.year}
                    </span>
                  </span>
                  <p className="text-secondary text-caption leading-relaxed">
                    {m.note}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-[clamp(16px,2.5vh,24px)]">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-[48ch]">
                <h2 className="text-[clamp(22px,2.6vw,32px)] leading-[1.45] font-heading tracking-[-0.025em]">
                  {aboutPage.team.title}
                </h2>
                <p className="text-secondary mt-2.5 text-caption leading-relaxed">
                  {aboutPage.team.subtitle}
                </p>
              </div>
              <Link
                href="/support"
                className="text-body font-emphasis whitespace-nowrap"
              >
                {aboutPage.team.contactCta}
              </Link>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(176px,1fr))] gap-[clamp(14px,2vw,20px)]">
              {aboutPage.team.members.map((member, i) => (
                <article
                  key={member.name}
                  className="border-border hover:border-border-done group flex flex-col overflow-hidden rounded-card border bg-surface transition-[border-color,transform] duration-300 hover:-translate-y-1"
                >
                  <div
                    className={`aspect-square ${i % 2 ? "bg-brand-tint-3" : "bg-brand-tint-1"}`}
                  >
                    <ImageSlot label={member.name} />
                  </div>
                  <div className="flex flex-col gap-1 p-4">
                    <span className="text-[14.5px] font-heading">
                      {member.name}
                    </span>
                    <span className="text-secondary text-caption leading-relaxed">
                      {member.role}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="bg-surface-dark relative grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] items-center gap-[clamp(20px,3vw,44px)] overflow-hidden rounded-card-lg p-[clamp(26px,4vw,44px)] text-on-dark">
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
