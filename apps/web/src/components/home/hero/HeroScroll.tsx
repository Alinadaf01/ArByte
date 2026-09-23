"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatNumberFa, homeHero } from "@arbyte/contracts";
import {
  activeStep,
  bandAt,
  easeStep,
  fitTransform,
  frameUrl,
  HERO_STEP_RANGES,
  type HeroManifest,
} from "./hero-engine";

const HEADER_HEIGHT = 72;
const EAGER_DESKTOP = 60;
const EAGER_MOBILE = 28;
const STEP_COUNT = homeHero.steps.length;

interface HeroScrollProps {
  manifest: HeroManifest | null;
}

/**
 * T-211 §۲ — نقطه‌ی ورود هیروی اسکرولی. اگر manifest نباشد (فریم نهایی
 * هنوز نرسیده)، پوستر ثابت رندر می‌شود — صفحه هرگز به‌خاطر نبود فریم
 * نمی‌شکند (هشدار صریح تسک). اگر prefers-reduced-motion باشد، اسکراب
 * غیرفعال است و فقط آخرین فریم + کارت‌های گام به‌صورت عمودی نشان داده
 * می‌شود.
 */
export function HeroScroll({ manifest }: HeroScrollProps) {
  const reducedMotion = usePrefersReducedMotion();

  if (!manifest) return <HeroPoster />;
  if (reducedMotion) return <HeroStatic manifest={manifest} />;
  return <HeroScrollEngine manifest={manifest} />;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setMobile(mq.matches);
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return mobile;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function computeProgress(wrapperEl: HTMLElement): number {
  const rect = wrapperEl.getBoundingClientRect();
  const viewportH = window.innerHeight;
  const denom = rect.height - (viewportH - HEADER_HEIGHT);
  if (denom <= 0) return 0;
  return clamp01((HEADER_HEIGHT - rect.top) / denom);
}

/** بج «جدید» + عنوان/زیرمتن هیرو — در هر سه حالت (پوستر/استاتیک/اسکراب) یکسان است. */
function HeroHeading() {
  return (
    <div className="relative z-10 flex flex-col items-start gap-4 text-right">
      <span className="bg-surface/90 text-caption text-brand font-emphasis inline-flex items-center gap-1.5 rounded-pill px-3 py-1">
        {homeHero.badgeNew} · {homeHero.badgeText}
      </span>
      <h1 className="text-hero text-primary font-heading leading-[1.3] tracking-tight text-balance">
        {homeHero.title}
      </h1>
      <p className="text-body text-secondary max-w-[52ch] leading-8">
        {homeHero.subtitle}
      </p>
    </div>
  );
}

function HeroCtaBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="border-border bg-surface/95 relative z-10 flex flex-col items-start gap-3 rounded-panel border p-4 backdrop-blur-sm md:flex-row md:items-center md:justify-between md:gap-6">
      <div className="flex flex-col gap-1">
        <span className="text-caption text-secondary">
          {homeHero.expertPickLabel}
        </span>
        <span className="text-body text-primary font-emphasis">
          {homeHero.modelOf(
            formatNumberFa(currentStep + 1),
            formatNumberFa(STEP_COUNT),
          )}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/products"
          className="bg-primary text-on-dark hover:bg-brand rounded-pill px-5 py-2.5 text-caption font-emphasis transition-colors duration-200"
        >
          {homeHero.viewModelsCta}
        </Link>
        <Link
          href="/support"
          className="border-border text-primary hover:bg-surface-muted rounded-pill border px-5 py-2.5 text-caption font-emphasis transition-colors duration-200"
        >
          {homeHero.consultCta}
        </Link>
      </div>
    </div>
  );
}

/** چهار کارت گام — نسخه‌ی چیده‌شده‌ی عمودی (پوستر و حالت reduced-motion). */
function HeroStepCardsStatic({ activeIndex }: { activeIndex?: number }) {
  return (
    <div className="relative z-10 grid gap-3 md:grid-cols-4">
      {homeHero.steps.map((step, i) => (
        <article
          key={step.label}
          className={`border-border bg-surface/90 rounded-panel border p-4 transition-colors duration-200 ${
            activeIndex === i ? "border-brand" : ""
          }`}
        >
          <span className="text-caption text-brand font-emphasis">
            {step.label}
          </span>
          <p className="text-caption text-primary mt-1">{step.title}</p>
        </article>
      ))}
    </div>
  );
}

/** پس‌زمینه‌ی گرادیانی برند — هم پوستر و هم لایه‌ی زیرین حالت اسکراب. */
function HeroAmbientBackground() {
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
      <div className="from-brand-tint-1 via-surface to-surface absolute inset-0 bg-gradient-to-b" />
      <div className="bg-brand-tint-3 absolute -top-24 end-[-10%] size-[36rem] rounded-full opacity-40 blur-3xl" />
      <div className="bg-accent/25 absolute bottom-[-15%] start-[-8%] size-[30rem] rounded-full opacity-40 blur-3xl" />
    </div>
  );
}

/** بدون manifest — پوستر ثابت، بدون هیچ درخواست فریم. */
function HeroPoster() {
  return (
    <section className="relative overflow-hidden px-[5vw] py-16 md:py-24">
      <HeroAmbientBackground />
      <div className="relative mx-auto flex max-w-[1400px] flex-col gap-10">
        <HeroHeading />
        <HeroStepCardsStatic />
        <HeroCtaBar currentStep={0} />
      </div>
    </section>
  );
}

/** manifest هست ولی prefers-reduced-motion — آخرین فریم ثابت، بدون اسکراب. */
function HeroStatic({ manifest }: { manifest: HeroManifest }) {
  const mobile = useIsMobile();
  const lastIndex = manifest.count - 1;

  return (
    <section className="relative overflow-hidden px-[5vw] py-16 md:py-24">
      <HeroAmbientBackground />
      <div className="relative mx-auto flex max-w-[1400px] flex-col gap-10">
        <HeroHeading />
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-card-lg">
          {/* eslint-disable-next-line @next/next/no-img-element -- فریم‌های تولیدشده‌ی محلی‌اند، next/image نیاز نیست */}
          <img
            src={frameUrl(manifest, lastIndex, mobile)}
            alt=""
            className="size-full object-contain"
            style={{ mixBlendMode: "multiply" }}
          />
        </div>
        <HeroStepCardsStatic />
        <HeroCtaBar currentStep={STEP_COUNT - 1} />
      </div>
    </section>
  );
}

/**
 * حالت کامل اسکراب. ⚠️ اسکرول پنجره (نه کانتینر تودرتوی نمونه‌ی طراحی)،
 * listener با passive، و هیچ setState به‌ازای هر فریم — فقط transform/src
 * مستقیم روی ref اعمال می‌شود؛ state فقط وقتی گام فعال واقعاً عوض شود.
 */
function HeroScrollEngine({ manifest }: { manifest: HeroManifest }) {
  const mobile = useIsMobile();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);

  const targetFrameRef = useRef(0);
  const dispRef = useRef(0);
  const lastAppliedIndexRef = useRef(-1);
  const panelSizeRef = useRef({ width: 0, height: 0 });
  const actRef = useRef(0);
  const startedRef = useRef(false);

  const [act, setAct] = useState(0);
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadPercent, setLoadPercent] = useState(0);

  // پیش‌بارگذاری: eager (۶۰ دسکتاپ/۲۸ موبایل) فوری، بقیه در idle.
  useEffect(() => {
    let cancelled = false;
    const eagerCount = Math.min(
      mobile ? EAGER_MOBILE : EAGER_DESKTOP,
      manifest.count,
    );
    let loaded = 0;

    setReady(false);
    setLoadPercent(0);

    for (let i = 0; i < eagerCount; i++) {
      const img = new Image();
      img.onload = img.onerror = () => {
        if (cancelled) return;
        loaded++;
        setLoadPercent(Math.round((loaded / eagerCount) * 100));
        if (loaded === eagerCount) setReady(true);
      };
      img.src = frameUrl(manifest, i, mobile);
    }

    const w = window as Window & {
      requestIdleCallback?: (cb: () => void) => number;
    };
    const idle = (cb: () => void) => {
      if (typeof w.requestIdleCallback === "function") {
        w.requestIdleCallback(cb);
      } else {
        window.setTimeout(cb, 1);
      }
    };

    let rest = eagerCount;
    const preloadNext = () => {
      if (cancelled || rest >= manifest.count) return;
      const img = new Image();
      img.src = frameUrl(manifest, rest, mobile);
      rest++;
      idle(preloadNext);
    };
    idle(preloadNext);

    return () => {
      cancelled = true;
    };
  }, [manifest, mobile]);

  // اندازه‌ی پنل فقط روی mount/resize محاسبه می‌شود، نه هر فریم.
  useEffect(() => {
    function updatePanelSize() {
      const el = panelRef.current;
      if (!el) return;
      panelSizeRef.current = { width: el.clientWidth, height: el.clientHeight };
    }
    updatePanelSize();
    window.addEventListener("resize", updatePanelSize);
    return () => window.removeEventListener("resize", updatePanelSize);
  }, []);

  // اسکرول پنجره: progress را مستقیم از rect محاسبه می‌کند — نه از یک
  // کانتینر تودرتو (تفاوت الزامی با نمونه‌ی طراحی، §۲ تسک).
  useEffect(() => {
    function onScroll() {
      const wrapperEl = wrapperRef.current;
      if (!wrapperEl) return;
      const p = computeProgress(wrapperEl);
      targetFrameRef.current = p * (manifest.count - 1);

      const newAct = activeStep(p);
      if (newAct !== actRef.current) {
        actRef.current = newAct;
        setAct(newAct);
      }
      const newStarted = p > 0.001;
      if (newStarted !== startedRef.current) {
        startedRef.current = newStarted;
        setStarted(newStarted);
      }

      homeHero.steps.forEach((_, i) => {
        const [from, to] = HERO_STEP_RANGES[i] ?? [0, 1];
        const fill = clamp01((p - from) / (to - from));
        const bar = barRefs.current[i];
        if (bar) bar.style.width = `${(fill * 100).toFixed(1)}%`;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [manifest]);

  // حلقه‌ی rAF: disp را به‌سمت target ease می‌کند و transform/src را
  // مستقیم روی ref اعمال می‌کند — هرگز setState اینجا.
  useEffect(() => {
    let rafId: number;

    function loop() {
      dispRef.current = easeStep(dispRef.current, targetFrameRef.current);
      const index = Math.min(
        manifest.count - 1,
        Math.max(0, Math.round(dispRef.current)),
      );

      const img = imgRef.current;
      if (img) {
        if (index !== lastAppliedIndexRef.current) {
          lastAppliedIndexRef.current = index;
          img.src = frameUrl(manifest, index, mobile);
        }
        const band = bandAt(manifest.bands, dispRef.current);
        const { width, height } = panelSizeRef.current;
        img.style.transform = fitTransform({
          band,
          panelHeight: height || 1,
          panelWidth: width || 1,
          frameWidth: manifest.width,
          frameHeight: manifest.height,
        });
      }

      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [manifest, mobile]);

  return (
    <div ref={wrapperRef} className="relative h-[320vh] md:h-[520vh]">
      <div
        ref={panelRef}
        className="sticky top-[72px] h-[calc(100dvh-72px)] overflow-hidden px-[5vw] py-10 md:py-16"
      >
        <HeroAmbientBackground />

        <div className="relative z-10 mx-auto flex h-full max-w-[1400px] flex-col justify-between gap-6">
          <HeroHeading />

          <div className="relative min-h-0 flex-1">
            {/* eslint-disable-next-line @next/next/no-img-element -- فریم‌های محلی‌اند و مکرراً با src خام (نه loader) عوض می‌شوند */}
            <img
              ref={imgRef}
              alt=""
              fetchPriority="high"
              src={frameUrl(manifest, 0, mobile)}
              className="pointer-events-none absolute start-1/2 top-full h-full w-auto max-w-none"
              style={{ mixBlendMode: "multiply" }}
            />

            {!started ? (
              <span className="text-caption text-secondary absolute bottom-2 start-1/2 -translate-x-1/2 animate-pulse">
                {homeHero.scrollHint}
              </span>
            ) : null}

            {/*
              کراس‌فید — نه ردیف/گرید: هر چهار کارت دقیقاً روی هم (bottom-0
              مشترک) می‌نشینند و فقط با opacity/translateY جابه‌جا می‌شوند؛
              اگر این‌ها هم‌عرض در فلوی معمولی چیده شوند (مثلاً grid)، روی
              موبایل ارتفاع مجموع از فضای واقعی هیرو بیشتر می‌شود و روی متن
              بالا می‌افتد.
            */}
            {homeHero.steps.map((step, i) => (
              <article
                key={step.label}
                aria-hidden={act !== i}
                className="border-border bg-surface/90 pointer-events-none absolute bottom-0 start-0 w-full max-w-sm rounded-panel border p-4 transition-[opacity,transform] duration-300"
                style={{
                  opacity: act === i ? 1 : 0,
                  transform: `translateY(${act === i ? 0 : 16}px)`,
                }}
              >
                <span className="text-caption text-brand font-emphasis">
                  {step.label}
                </span>
                <p className="text-caption text-primary mt-1">{step.title}</p>
                <div className="bg-border mt-3 h-1 overflow-hidden rounded-pill">
                  <div
                    ref={(el) => {
                      barRefs.current[i] = el;
                    }}
                    className="bg-brand h-full rounded-pill"
                    style={{ width: 0 }}
                  />
                </div>
              </article>
            ))}
          </div>

          <HeroCtaBar currentStep={act} />
        </div>

        {!ready ? (
          <div
            className="bg-surface pointer-events-none absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-300"
            style={{ opacity: ready ? 0 : 1 }}
          >
            <span className="text-body text-secondary font-emphasis">
              {loadPercent >= 100
                ? homeHero.readyLabel
                : homeHero.loadingLabel(formatNumberFa(loadPercent))}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
