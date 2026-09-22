"use client";

import { useState } from "react";
import Link from "next/link";
import { notFoundPage } from "@arbyte/contracts";

export function NotFoundContent() {
  const [query, setQuery] = useState("");
  const q = query.trim();
  const searchHref = q ? `/search?q=${encodeURIComponent(q)}` : "/search";

  return (
    <main className="flex items-center justify-center px-[5vw] py-[clamp(48px,10vh,120px)]">
      <div className="grid w-full max-w-[1040px] grid-cols-[repeat(auto-fit,minmax(290px,1fr))] items-center gap-[clamp(24px,5vw,64px)]">
        <div className="flex min-w-0 flex-col gap-4.5">
          <span className="bg-surface border-border text-brand-active inline-flex w-fit items-center gap-2 rounded-pill border px-3.5 py-1.5 text-caption font-emphasis">
            <i
              className="bg-brand block h-1.5 w-1.5 rounded-full"
              aria-hidden="true"
            />
            {notFoundPage.badge}
          </span>
          <h1 className="max-w-[18ch] text-pretty text-[clamp(26px,3.4vw,42px)] leading-[1.4] font-heading tracking-[-0.028em]">
            {notFoundPage.title}
          </h1>
          <p className="text-secondary max-w-[46ch] text-body leading-loose">
            {notFoundPage.body}
          </p>

          <label className="border-border-input bg-surface flex min-h-13.5 max-w-110 items-center gap-2.5 rounded-panel border px-4.5">
            <svg
              width="19"
              height="19"
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
              onChange={(e) => setQuery(e.target.value)}
              placeholder={notFoundPage.searchPlaceholder}
              aria-label={notFoundPage.searchAriaLabel}
              className="text-input text-primary min-w-0 flex-1 border-0 bg-transparent outline-none"
            />
            <Link
              href={searchHref}
              className="bg-primary text-on-dark hover:bg-brand flex min-h-11 flex-none items-center rounded-tile-sm px-4.5 text-caption font-emphasis whitespace-nowrap transition-colors duration-250"
            >
              {notFoundPage.searchButton}
            </Link>
          </label>

          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/"
              className="bg-primary text-on-dark hover:bg-brand flex min-h-12 items-center rounded-pill px-6 text-[14.5px] font-emphasis transition-colors duration-250"
            >
              {notFoundPage.primaryCta}
            </Link>
            <Link
              href="/products"
              className="border-border-input text-secondary-2 hover:border-brand hover:text-brand-active flex min-h-12 items-center rounded-pill border px-5.5 text-[14.5px] font-emphasis transition-colors duration-200"
            >
              {notFoundPage.secondaryCta}
            </Link>
          </div>

          <div className="border-border mt-1.5 grid max-w-130 grid-cols-[repeat(auto-fit,minmax(136px,1fr))] gap-2.5 border-t pt-5">
            <Link
              href="/categories"
              className="border-border bg-surface hover:border-border-done hover:text-brand-active text-secondary-2 flex min-h-11.5 items-center gap-2.5 rounded-tile-sm border px-3.5 text-caption font-emphasis transition-[border-color,color] duration-200"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-brand flex-none"
                aria-hidden="true"
              >
                <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
                <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
                <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
                <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
              </svg>
              {notFoundPage.links.categories}
            </Link>
            <Link
              href="/track-order"
              className="border-border bg-surface hover:border-border-done hover:text-brand-active text-secondary-2 flex min-h-11.5 items-center gap-2.5 rounded-tile-sm border px-3.5 text-caption font-emphasis transition-[border-color,color] duration-200"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-brand flex-none"
                aria-hidden="true"
              >
                <path d="M2.5 7.5h10v9h-10z" />
                <path d="M12.5 10.5h4l3 3v3h-7z" />
                <circle cx="6.5" cy="17.5" r="1.8" />
                <circle cx="16.5" cy="17.5" r="1.8" />
              </svg>
              {notFoundPage.links.trackOrder}
            </Link>
            <Link
              href="/blog"
              className="border-border bg-surface hover:border-border-done hover:text-brand-active text-secondary-2 flex min-h-11.5 items-center gap-2.5 rounded-tile-sm border px-3.5 text-caption font-emphasis transition-[border-color,color] duration-200"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-brand flex-none"
                aria-hidden="true"
              >
                <path d="M6.5 4h11v16l-5.5-4-5.5 4Z" />
              </svg>
              {notFoundPage.links.blog}
            </Link>
            <Link
              href="/support"
              className="border-border bg-surface hover:border-border-done hover:text-brand-active text-secondary-2 flex min-h-11.5 items-center gap-2.5 rounded-tile-sm border px-3.5 text-caption font-emphasis transition-[border-color,color] duration-200"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-brand flex-none"
                aria-hidden="true"
              >
                <path d="M21 12a9 9 0 0 1-13.2 7.9L3 21l1.2-4.6A9 9 0 1 1 21 12Z" />
              </svg>
              {notFoundPage.links.support}
            </Link>
          </div>
        </div>

        <div className="relative mx-auto flex aspect-square w-full max-w-100 min-w-0 items-center justify-center">
          <span
            aria-hidden="true"
            className="bg-glow-violet absolute block aspect-square w-[76%] animate-pulse rounded-full"
          />
          <span
            aria-hidden="true"
            className="border-border-input absolute inset-0 block rounded-full border border-dashed"
          />
          <div
            aria-hidden="true"
            className="relative flex items-center justify-center"
          >
            <svg
              width="74%"
              viewBox="0 0 220 150"
              fill="none"
              style={{ overflow: "visible" }}
            >
              <rect
                x="24"
                y="16"
                width="172"
                height="104"
                rx="11"
                className="fill-surface stroke-border-input"
                strokeWidth="2"
              />
              <rect
                x="34"
                y="26"
                width="152"
                height="84"
                rx="6"
                className="fill-primary"
              />
              <text
                x="110"
                y="78"
                textAnchor="middle"
                fontFamily="sans-serif"
                fontSize="42"
                fontWeight="700"
                letterSpacing="2"
                className="fill-brand-on-dark-alt"
              >
                404
              </text>
              <path
                d="M14 120h192a10 10 0 0 1-10 12H24a10 10 0 0 1-10-12Z"
                className="fill-brand-tint-1 stroke-border-input"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <circle cx="110" cy="126" r="2.6" className="fill-border-done" />
            </svg>
          </div>
        </div>
      </div>
    </main>
  );
}
