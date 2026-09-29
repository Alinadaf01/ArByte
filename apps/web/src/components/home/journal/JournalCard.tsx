"use client";

import Link from "next/link";
import { useState } from "react";
import { formatNumberFa, homeJournal } from "@arbyte/contracts";
import type { JournalCardData } from "@/content/home-journal";

const VARIANT_GRADIENT: Record<JournalCardData["variant"], string> = {
  violet: "from-brand to-brand-active",
  dark: "from-surface-dark to-secondary-2",
  cyan: "from-accent-deep to-accent",
};
// G-02 — `!` لازم است: `text-caption` در Tailwind v4 رنگ `--color-caption` را
// هم می‌دهد و روی این رنگ می‌نشست (کنتراست ۳٫۴ روی پشت تیره‌ی کارت).
const VARIANT_CTA_TEXT: Record<JournalCardData["variant"], string> = {
  violet: "!text-brand-on-dark-alt",
  dark: "!text-brand-on-dark-alt",
  cyan: "!text-accent",
};

interface JournalCardProps {
  card: JournalCardData;
  reducedMotion?: boolean;
}

/**
 * یک کارت مجله — جلو (تگ+عنوان) و پشت (زمان مطالعه+CTA). دسکتاپ با
 * hover واقعی CSS برمی‌گردد (بدون state)؛ کلیک/کیبورد همیشه کار می‌کند
 * (برای موبایل و برای دسترس‌پذیری کیبورد در همه‌جا، طبق §۲ سند تسک).
 * `reducedMotion`: بدون چرخش سه‌بعدی، برگشت با fade.
 */
export function JournalCard({ card, reducedMotion }: JournalCardProps) {
  const [flipped, setFlipped] = useState(false);
  const gradient = VARIANT_GRADIENT[card.variant];
  const ctaColor = VARIANT_CTA_TEXT[card.variant];

  const toggle = () => setFlipped((v) => !v);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
      className="group relative size-full cursor-pointer outline-none"
      style={{ perspective: reducedMotion ? undefined : "900px" }}
    >
      {reducedMotion ? (
        <div className="relative size-full">
          <div
            className={`bg-gradient-to-br ${gradient} absolute inset-0 flex flex-col justify-between rounded-tile p-3 shadow-popover transition-opacity duration-300 ${flipped ? "opacity-0" : "opacity-100"}`}
          >
            <span className="text-micro text-on-dark font-emphasis">
              {card.tag}
            </span>
            <h3 className="text-caption text-on-dark text-pretty font-heading leading-6">
              {card.title}
            </h3>
          </div>
          <div
            className={`bg-surface-dark absolute inset-0 flex flex-col justify-end gap-1 rounded-tile p-3 shadow-popover transition-opacity duration-300 ${flipped ? "opacity-100" : "opacity-0"}`}
          >
            <span className="text-micro text-on-dark-secondary">
              {homeJournal.readMinutes(formatNumberFa(card.readMinutes))}
            </span>
            <Link
              href={`/blog/${card.slug}`}
              className={`text-caption font-emphasis ${ctaColor}`}
            >
              {homeJournal.readCta}
            </Link>
          </div>
        </div>
      ) : (
        <div
          className="relative size-full transition-transform duration-600 [transform-style:preserve-3d] md:group-hover:[transform:rotateY(180deg)_scale(1.22)]"
          style={{
            transform: flipped ? "rotateY(180deg)" : undefined,
            transitionTimingFunction: "cubic-bezier(.3,1,.4,1)",
          }}
        >
          <div
            className={`bg-gradient-to-br ${gradient} absolute inset-0 flex flex-col justify-between rounded-tile p-3 shadow-popover [backface-visibility:hidden]`}
          >
            <span className="text-micro text-on-dark font-emphasis">
              {card.tag}
            </span>
            <h3 className="text-caption text-on-dark text-pretty font-heading leading-6">
              {card.title}
            </h3>
          </div>
          <div
            className="bg-surface-dark absolute inset-0 flex flex-col justify-end gap-1 rounded-tile p-3 shadow-popover [backface-visibility:hidden]"
            style={{ transform: "rotateY(180deg)" }}
          >
            <span className="text-micro text-on-dark-secondary">
              {homeJournal.readMinutes(formatNumberFa(card.readMinutes))}
            </span>
            <Link
              href={`/blog/${card.slug}`}
              className={`text-caption font-emphasis ${ctaColor}`}
            >
              {homeJournal.readCta}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
