"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatNumberFa,
  homeFaq,
  storeFacts,
  type FaqItem,
  type SiteInfo,
} from "@arbyte/contracts";
import { displayRows, isOpenNow, openingTime } from "@/lib/business-hours";

const HOME_LIMIT = 4;

/**
 * T-212 §۳ — آکاردئون سوالات متداول (فقط ۴ مورد `onHome`) + کارت پشتیبانی
 * چسبان. کل بخش کلاینت است چون هم آکاردئون state دارد هم وضعیت آنلاین
 * باید بعد از mount محاسبه شود (تفاوت سرور/کلاینت، هیدریشن‌سیف: پیش‌فرض
 * false تا وقتی mount واقعی ساعت را بخواند).
 */
export function FaqSection({
  info,
  items,
}: {
  info: SiteInfo;
  items: FaqItem[];
}) {
  const [openIndex, setOpenIndex] = useState(0);
  const [online, setOnline] = useState(false);
  // سوال‌ها از پنل («سوالات متداول»، تیک «صفحه اصلی»)؛ ساعت و تلفن از
  // SiteSettings — همان منبع هدر، فوتر و صفحه‌ی پشتیبانی.
  const questions = items.filter((item) => item.onHome).slice(0, HOME_LIMIT);
  const rows = info.businessHours;
  const first = displayRows(rows)[0]!;
  const phoneHref =
    info.phone?.href ??
    (storeFacts.support.phone ? `tel:${storeFacts.support.phone}` : null);

  useEffect(() => {
    const check = () => setOnline(isOpenNow(new Date(), rows));
    check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, [rows]);

  return (
    <section className="bg-paper border-border border-t px-[5vw] py-14 md:py-20">
      <div className="mx-auto grid max-w-[1240px] items-start gap-8 md:grid-cols-[minmax(260px,1fr)_2fr]">
        <aside className="border-border flex flex-col gap-4.5 md:sticky md:top-24">
          <span className="bg-brand-tint-1 text-caption !text-brand-active inline-flex w-fit items-center gap-1.5 rounded-pill px-3 py-1 font-emphasis">
            {homeFaq.badge}
          </span>
          <div>
            <h2 className="text-h2 text-primary font-heading tracking-tight">
              {homeFaq.title}
            </h2>
            <p className="text-caption text-secondary mt-2 max-w-[42ch] leading-7">
              {homeFaq.subtitle}
            </p>
          </div>

          <div className="bg-surface-dark flex flex-col gap-4 rounded-panel p-5">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`size-2 rounded-full ${online ? "bg-accent" : "bg-on-dark-tertiary"}`}
              />
              <span className="text-caption text-on-dark font-emphasis">
                {online
                  ? homeFaq.onlineNow
                  : homeFaq.offlineHint(openingTime(rows))}
              </span>
            </div>

            {storeFacts.support.avgResponseMinutes != null ? (
              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-0.5">
                  <span
                    dir="ltr"
                    className="text-on-dark text-body font-heading"
                  >
                    {formatNumberFa(storeFacts.support.avgResponseMinutes)}{" "}
                    دقیقه
                  </span>
                  <span className="text-micro text-on-dark-secondary">
                    {homeFaq.avgResponseLabel}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span
                    dir="ltr"
                    className="text-on-dark text-body font-heading"
                  >
                    {first.time}
                  </span>
                  <span className="text-micro text-on-dark-secondary">
                    {first.day}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                <span dir="ltr" className="text-on-dark text-body font-heading">
                  {first.time}
                </span>
                <span className="text-micro text-on-dark-secondary">
                  {first.day}
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Link
                href="/support"
                className="bg-surface text-primary hover:bg-surface-muted rounded-pill px-4.5 py-2.5 text-caption font-emphasis whitespace-nowrap transition-colors duration-200"
              >
                {homeFaq.chatCta}
              </Link>
              {phoneHref ? (
                <a
                  href={phoneHref}
                  className="border-border-done text-on-dark hover:bg-surface/10 rounded-pill border px-4 py-2.5 text-caption font-emphasis whitespace-nowrap transition-colors duration-200"
                >
                  {homeFaq.callCta}
                </a>
              ) : null}
            </div>
          </div>
        </aside>

        <div className="flex flex-col">
          {questions.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                onClick={() => setOpenIndex(isOpen ? -1 : i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpenIndex(isOpen ? -1 : i);
                  }
                }}
                className="border-border-divider hover:bg-surface relative grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3.5 border-b p-4.5 transition-colors duration-300 last:border-b-0"
              >
                <span
                  dir="ltr"
                  className="text-secondary-2 pt-1 text-caption font-heading tracking-[0.07em]"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <h3 className="text-body text-primary text-pretty font-emphasis leading-7">
                    {item.question}
                  </h3>
                  <div
                    className="grid transition-[grid-template-rows] duration-[450ms]"
                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <p
                        className={`text-secondary max-w-[56ch] pt-2.5 text-caption leading-8 transition-opacity duration-[400ms] ${isOpen ? "opacity-100" : "opacity-0"}`}
                      >
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
                <span
                  className="bg-brand-tint-1 flex size-7.5 items-center justify-center rounded-full transition-transform duration-[450ms]"
                  style={{
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 18 18"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="m4.5 7.2 3.793 3.793a1 1 0 0 0 1.414 0L13.5 7.2"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-brand-active"
                    />
                  </svg>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
