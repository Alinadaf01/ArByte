"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatNumberFa, searchPage } from "@arbyte/contracts";

type SearchKind = "all" | "products" | "posts" | "support";

interface SearchFormProps {
  q: string;
  kind: SearchKind;
  resultCount: number;
  isIdle: boolean;
}

const DEBOUNCE_MS = 300;

function buildHref(q: string, kind: SearchKind): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (kind !== "all") params.set("kind", kind);
  const qs = params.toString();
  return `/search${qs ? `?${qs}` : ""}`;
}

/**
 * T-215 §۱ — فرم واقعی `<form method="get">` (کار می‌کند حتی بدون JS، با
 * Enter روی فیلد submit می‌شود). تایپ زنده با دیباونس `router.replace` می‌زند
 * (بدون ورود به history برای هر حرف). تب‌ها `<Link>` واقعی‌اند.
 */
export function SearchForm({ q, kind, resultCount, isIdle }: SearchFormProps) {
  const router = useRouter();
  const [value, setValue] = useState(q);
  const debounceRef = useRef<number | undefined>(undefined);

  useEffect(() => setValue(q), [q]);

  function handleChange(next: string) {
    setValue(next);
    if (debounceRef.current !== undefined)
      window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      router.replace(buildHref(next, kind), { scroll: false });
    }, DEBOUNCE_MS);
  }

  function handleClear() {
    if (debounceRef.current !== undefined)
      window.clearTimeout(debounceRef.current);
    setValue("");
    router.replace(buildHref("", kind), { scroll: false });
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        action="/search"
        method="get"
        className="border-border-input bg-surface flex min-h-14.5 items-center gap-3 rounded-panel border px-4.5"
      >
        <svg
          width="20"
          height="20"
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
          name="q"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={searchPage.inputPlaceholder}
          aria-label={searchPage.inputAriaLabel}
          autoFocus
          className="text-input text-primary min-w-0 flex-1 border-0 bg-transparent outline-none"
        />
        {value ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label={searchPage.clearAriaLabel}
            className="text-secondary hover:bg-surface-muted flex h-11 w-11 flex-none items-center justify-center rounded-full transition-colors duration-200"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
            >
              <path d="m7 7 10 10M17 7 7 17" />
            </svg>
          </button>
        ) : null}
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-caption text-secondary">
          {isIdle
            ? searchPage.idleSummary
            : searchPage.resultsSummary(formatNumberFa(resultCount), q)}
        </p>
        <div role="group" className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", searchPage.kindTabs.all],
              ["products", searchPage.kindTabs.products],
              ["posts", searchPage.kindTabs.posts],
              ["support", searchPage.kindTabs.support],
            ] as const
          ).map(([value_, label]) => {
            const active = kind === value_;
            return (
              <Link
                key={value_}
                href={buildHref(q, value_)}
                aria-current={active ? "true" : undefined}
                className={`min-h-11 rounded-tile-sm px-4 text-caption font-emphasis transition-colors duration-200 ${
                  active
                    ? "bg-primary text-on-dark"
                    : "border-border-input text-secondary-2 hover:border-brand-tint-2 border bg-surface"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
