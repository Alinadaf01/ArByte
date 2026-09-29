"use client";

import { useState } from "react";
import Link from "next/link";
import { categoriesPage } from "@arbyte/contracts";

const CHIP_BASE =
  "min-h-10.5 rounded-tile border px-4 text-caption font-emphasis transition-colors duration-200";
const CHIP_ON = "border-primary bg-primary text-on-dark";
const CHIP_OFF =
  "border-border-input bg-surface text-secondary-2 hover:border-brand-tint-2";

/**
 * T-213 §۸ / E-01 §۵ — سوییچر «نمی‌دانید کدام دسته؟» (`Categories.dc.html`).
 * هر گزینه حالا به دسته‌ی واقعی خودش لینک می‌دهد (`categoriesPage.useCases[].href`،
 * جدول Q-11 سند تسک) — قبلاً همه به `/products` عمومی می‌رفتند چون فیلتر
 * واقعی بر اساس کاربری نبود.
 */
export function UseCaseSwitcher() {
  const [active, setActive] = useState(0);

  return (
    <section className="border-border bg-surface mt-2 grid grid-cols-1 gap-6 rounded-panel border p-6 sm:grid-cols-2 md:p-9">
      <div className="min-w-0">
        <h2 className="text-subhead text-primary font-heading tracking-tight">
          {categoriesPage.useCaseSwitcher.title}
        </h2>
        <p className="text-caption text-secondary mt-2 max-w-[40ch]">
          {categoriesPage.useCaseSwitcher.subtitle}
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-3.5">
        <div className="flex flex-wrap gap-2">
          {categoriesPage.useCases.map((useCase, index) => (
            <button
              key={useCase.label}
              type="button"
              aria-pressed={active === index}
              onClick={() => setActive(index)}
              className={`${CHIP_BASE} ${active === index ? CHIP_ON : CHIP_OFF}`}
            >
              {useCase.label}
            </button>
          ))}
        </div>

        <div className="bg-paper border-border flex flex-wrap items-center justify-between gap-3.5 rounded-tile border p-4">
          <p className="text-caption text-primary max-w-[40ch] leading-relaxed">
            {categoriesPage.useCases[active]?.description}
          </p>
          <Link
            href={categoriesPage.useCases[active]?.href ?? "/products"}
            className="bg-primary text-on-dark min-h-10.5 shrink-0 rounded-pill px-5 text-caption font-emphasis whitespace-nowrap"
          >
            {categoriesPage.useCaseSwitcher.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}
