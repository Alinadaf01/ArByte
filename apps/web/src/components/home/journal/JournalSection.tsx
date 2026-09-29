"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { homeJournal } from "@arbyte/contracts";
import { usePrefersReducedMotion } from "@/lib/hooks";
import type { JournalCardData } from "@/content/home-journal";
import { JournalCard } from "./JournalCard";
import {
  cardTransformCss,
  computeCardTransform,
  computeMorphProgress,
} from "./journal-arc";

/**
 * T-212 §۲ — «پیش از خرید، بخوانید». دسکتاپ: قوس ۹ کارت که با اسکرول
 * پنجره باز می‌شود (`layoutArc()` پورت‌شده در `journal-arc.ts`، بدون
 * setState به‌ازای فریم — فقط transform مستقیم روی ref). موبایل: ردیف
 * افقی اسکرولی ساده (بدون منطق قوس، مثل طراحی). G-01: کارت‌ها از API
 * وبلاگ می‌آیند (صفحه‌ی اصلی، سمت سرور)؛ کمتر از ۳ نوشته = بخش پنهان.
 */
export function JournalSection({ cards }: { cards: JournalCardData[] }) {
  const reducedMotion = usePrefersReducedMotion();
  const arcRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (reducedMotion) return;

    let sizeCache = { width: 0, height: 0 };
    const updateSize = () => {
      const el = arcRef.current;
      if (!el) return;
      sizeCache = { width: el.clientWidth, height: el.clientHeight };
    };
    updateSize();

    function apply() {
      const el = arcRef.current;
      if (!el) return;
      const { m, rp } = computeMorphProgress(
        el.getBoundingClientRect().top,
        window.innerHeight,
      );
      cardRefs.current.forEach((cardEl, i) => {
        if (!cardEl) return;
        const t = computeCardTransform(
          i,
          sizeCache.width,
          sizeCache.height,
          m,
          rp,
          cards.length,
        );
        cardEl.style.transform = cardTransformCss(t);
        cardEl.style.opacity = t.opacity.toFixed(3);
        cardEl.style.zIndex = String(t.zIndex);
      });
    }

    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        apply();
        rafId = null;
      });
    };
    const onResize = () => {
      updateSize();
      apply();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    apply();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [reducedMotion, cards.length]);

  // G-01 — کمتر از ۳ نوشته‌ی منتشرشده: کل بخش پنهان.
  if (cards.length < 3) return null;

  return (
    <section className="bg-surface border-border relative overflow-hidden border-t px-[5vw] py-14 md:py-20">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(54% 46% at 50% 88%, rgba(108,77,255,.14), rgba(246,244,252,0) 72%)",
        }}
      />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-6">
        <div>
          <span className="bg-surface text-brand inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-caption font-emphasis">
            {homeJournal.badge}
          </span>
          <h2 className="text-h2 text-primary font-heading mt-2.5 tracking-tight">
            {homeJournal.title}
          </h2>
          <p className="text-caption text-secondary mt-1.5 max-w-[52ch] leading-7">
            {homeJournal.subtitle}{" "}
            <span className="hidden md:inline">{homeJournal.hintDesktop}</span>
            <span className="md:hidden">{homeJournal.hintMobile}</span>
          </p>
        </div>
        <Link
          href="/blog"
          className="text-body text-primary font-emphasis hover:text-brand"
        >
          {homeJournal.viewAllCta}
        </Link>
      </div>

      {/* موبایل — ردیف افقی ساده، بدون قوس. */}
      <div className="-mx-[5vw] flex gap-3 overflow-x-auto px-[5vw] pb-2.5 md:hidden">
        {cards.map((card) => (
          <div key={card.slug} className="h-62.5 w-47.5 flex-none">
            <JournalCard card={card} reducedMotion={reducedMotion} />
          </div>
        ))}
      </div>

      {/* دسکتاپ — قوس. */}
      <div
        ref={arcRef}
        className="relative mt-3 hidden md:block"
        style={{ height: reducedMotion ? "auto" : "clamp(320px,44vh,470px)" }}
      >
        {reducedMotion ? (
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-5">
            {cards.map((card) => (
              <div key={card.slug} className="h-33 w-23">
                <JournalCard card={card} reducedMotion />
              </div>
            ))}
          </div>
        ) : (
          cards.map((card, i) => (
            <div
              key={card.slug}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className="absolute top-1/2 start-1/2 h-33 w-23 -mt-16.5 -ms-11.5 [will-change:transform]"
            >
              <JournalCard card={card} />
            </div>
          ))
        )}
      </div>
    </section>
  );
}
