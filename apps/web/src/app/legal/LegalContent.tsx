"use client";

import { useState } from "react";
import Link from "next/link";
import { legalPage } from "@arbyte/contracts";

type SectionKey = "faq" | "warranty" | "returns" | "terms" | "privacy";

const SECTIONS: SectionKey[] = [
  "faq",
  "warranty",
  "returns",
  "terms",
  "privacy",
];

export function LegalContent() {
  const [section, setSection] = useState<SectionKey>("faq");
  const [openIndex, setOpenIndex] = useState(-1);
  const [query, setQuery] = useState("");

  const q = query.trim();
  const hits = legalPage.faq
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => q === "" || `${f.q} ${f.a}`.includes(q));

  const doc = section === "faq" ? null : legalPage.docs[section];

  return (
    <div className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-[clamp(16px,2.5vw,26px)] px-[5vw] py-[clamp(20px,3vh,32px)] pb-[clamp(48px,7vh,80px)]">
      <nav
        aria-label="بخش‌ها"
        className="border-border bg-surface md:sticky md:top-24 flex min-w-0 flex-1 basis-50 flex-row gap-0.5 overflow-x-auto rounded-panel border p-2.5 md:max-w-60 md:flex-col"
      >
        {SECTIONS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setSection(key);
              setOpenIndex(-1);
            }}
            className={`min-h-11.5 flex-none rounded-tile-sm px-3.5 text-start text-caption font-emphasis whitespace-nowrap transition-colors duration-200 md:flex-1 ${
              section === key
                ? "bg-primary text-on-dark"
                : "text-secondary-2 bg-transparent"
            }`}
          >
            {legalPage.sections[key]}
          </button>
        ))}
      </nav>

      <div className="flex min-w-0 flex-1 basis-110 flex-col gap-[clamp(14px,2vh,18px)]">
        {section === "faq" ? (
          <div className="flex flex-col gap-[clamp(12px,2vh,16px)]">
            <label className="border-border-input bg-surface flex min-h-12.5 items-center gap-2.5 rounded-panel-compact border px-4">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="text-secondary flex-none"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpenIndex(-1);
                }}
                placeholder={legalPage.faqSearch.placeholder}
                aria-label={legalPage.faqSearch.ariaLabel}
                className="text-input text-primary min-w-0 flex-1 border-0 bg-transparent outline-none"
              />
            </label>

            {hits.length === 0 ? (
              <div className="border-border bg-surface rounded-panel border p-9 text-center">
                <p className="mb-2 text-[16.5px] font-heading">
                  {legalPage.faqSearch.noResultsTitle}
                </p>
                <p className="text-secondary mb-4.5 text-caption leading-relaxed">
                  {legalPage.faqSearch.noResultsBody}
                </p>
                <Link
                  href="/support"
                  className="bg-primary text-on-dark hover:bg-brand inline-flex min-h-11.5 items-center rounded-pill px-6 text-caption font-emphasis transition-colors duration-250"
                >
                  {legalPage.faqSearch.noResultsCta}
                </Link>
              </div>
            ) : (
              <div className="border-border bg-surface overflow-hidden rounded-panel border">
                {hits.map(({ f, i }, n) => {
                  const isOpen = openIndex === i;
                  return (
                    <div
                      key={f.q}
                      role="button"
                      tabIndex={0}
                      onClick={() => setOpenIndex(isOpen ? -1 : i)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setOpenIndex(isOpen ? -1 : i);
                        }
                      }}
                      className="border-border-divider hover:bg-paper relative grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3.5 border-b p-4.5 transition-colors duration-300 last:border-b-0"
                    >
                      <span
                        dir="ltr"
                        className="text-secondary pt-0.5 text-caption font-heading tracking-[0.07em]"
                      >
                        {String(n + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-pretty text-[15px] leading-relaxed font-emphasis">
                          {f.q}
                        </h2>
                        <div
                          className="grid transition-[grid-template-rows] duration-[450ms]"
                          style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                        >
                          <div className="overflow-hidden">
                            <p
                              className={`text-secondary max-w-[62ch] pt-2.5 text-caption leading-loose transition-opacity duration-400 ${isOpen ? "opacity-100" : "opacity-0"}`}
                            >
                              {f.a}
                            </p>
                          </div>
                        </div>
                      </div>
                      <span
                        className="bg-brand-tint-3 flex h-7.5 w-7.5 flex-none items-center justify-center rounded-full transition-transform duration-[450ms]"
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
            )}
          </div>
        ) : doc ? (
          <article className="border-border bg-surface flex flex-col gap-4 rounded-card border p-[clamp(20px,3vw,32px)]">
            <h2 className="text-[clamp(19px,2.2vw,25px)] leading-relaxed font-heading tracking-[-0.02em]">
              {doc.title}
            </h2>
            {doc.blocks.map((block) => (
              <div key={block.h} className="flex max-w-[64ch] flex-col gap-2">
                <h3 className="text-[15px] leading-relaxed font-heading">
                  {block.h}
                </h3>
                <p className="text-secondary text-caption leading-loose">
                  {block.p}
                </p>
              </div>
            ))}
            <div className="border-border-divider mt-1.5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p className="text-micro text-secondary">
                {legalPage.lastUpdated}
              </p>
              <Link href="/support" className="text-caption font-emphasis">
                {legalPage.askSupport}
              </Link>
            </div>
          </article>
        ) : null}
      </div>
    </div>
  );
}
