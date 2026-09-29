"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatNumberFa, homeHero } from "@arbyte/contracts";
import { useIsMobile, usePrefersReducedMotion } from "@/lib/hooks";
import {
  activeStep,
  bandAt,
  easeStep,
  fitTransform,
  frameUrl,
  HERO_STEP_RANGES,
  nearestAvailableFrame,
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

const MAX_CACHED_FRAMES = 100;

/**
 * E-01 §۴ — کش LRU فریم‌های decode‌شده (`ImageBitmap`، از قبل decode
 * — نه `<img>` که هر بار paint دوباره rasterize می‌کند). سقف
 * `MAX_CACHED_FRAMES` حافظه را کراندار نگه می‌دارد؛ `touch()` هر بار
 * استفاده کلید را به انتهای Map منتقل می‌کند (ترتیب Map = ترتیب
 * least/most-recently-used)، `set()` روی سرریز قدیمی‌ترین را `close()`
 * و حذف می‌کند.
 */
class FrameBitmapCache {
  private map = new Map<number, ImageBitmap>();

  get(index: number): ImageBitmap | undefined {
    const bitmap = this.map.get(index);
    if (bitmap) {
      this.map.delete(index);
      this.map.set(index, bitmap);
    }
    return bitmap;
  }

  has(index: number): boolean {
    return this.map.has(index);
  }

  set(index: number, bitmap: ImageBitmap): void {
    if (this.map.has(index)) {
      this.map.get(index)?.close();
    }
    this.map.set(index, bitmap);
    while (this.map.size > MAX_CACHED_FRAMES) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey === undefined) break;
      this.map.get(oldestKey)?.close();
      this.map.delete(oldestKey);
    }
  }

  clear(): void {
    for (const bitmap of this.map.values()) bitmap.close();
    this.map.clear();
  }
}

async function decodeFrame(url: string): Promise<ImageBitmap> {
  const res = await fetch(url);
  const blob = await res.blob();
  return createImageBitmap(blob);
}

/**
 * حالت کامل اسکراب. ⚠️ اسکرول پنجره (نه کانتینر تودرتوی نمونه‌ی طراحی)،
 * listener با passive، و هیچ setState به‌ازای هر فریم — فقط transform/رسم
 * کانواس مستقیم روی ref اعمال می‌شود؛ state فقط وقتی گام فعال واقعاً عوض
 * شود. رندر روی `<canvas>` (نه عوض‌کردن `src` تصویر) با ترکیب دو فریم
 * مجاور (`globalAlpha`) چرخش را بدون پرش/چشمک نرم می‌کند.
 */
function HeroScrollEngine({ manifest }: { manifest: HeroManifest }) {
  const mobile = useIsMobile();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);

  const targetFrameRef = useRef(0);
  const dispRef = useRef(0);
  const panelSizeRef = useRef({ width: 0, height: 0 });
  const actRef = useRef(0);
  const startedRef = useRef(false);
  const cacheRef = useRef<FrameBitmapCache | null>(null);
  const pendingRef = useRef<Set<number>>(new Set());
  const dprRef = useRef(1);

  const [act, setAct] = useState(0);
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadPercent, setLoadPercent] = useState(0);

  // decode یک فریم (اگر از قبل در کش/در حال decode نیست) و پس از پایان
  // در کش LRU می‌گذارد — هم برای eager هم برای idle/on-demand استفاده می‌شود.
  function requestFrame(index: number, onDone?: () => void) {
    const cache = cacheRef.current;
    if (!cache || cache.has(index) || pendingRef.current.has(index)) return;
    pendingRef.current.add(index);
    decodeFrame(frameUrl(manifest, index, mobile))
      .then((bitmap) => {
        pendingRef.current.delete(index);
        cacheRef.current?.set(index, bitmap);
        onDone?.();
      })
      .catch(() => {
        pendingRef.current.delete(index);
      });
  }

  // پیش‌بارگذاری: eager (۶۰ دسکتاپ/۲۸ موبایل) فوری و decode‌شده (createImageBitmap)،
  // بقیه در idle — کش LRU سقف حافظه را کراندار نگه می‌دارد (E-01 §۴).
  useEffect(() => {
    let cancelled = false;
    cacheRef.current = new FrameBitmapCache();
    pendingRef.current = new Set();
    dprRef.current = Math.min(window.devicePixelRatio || 1, 2);

    // اندازه‌ی بوم imperative ست می‌شود (نه prop از dprRef در render — ref
    // تغییرش re-render نمی‌سازد) + یک‌بار scale(dpr) تا رسم‌های بعدی در
    // حلقه‌ی rAF با مختصات منطقی manifest.width/height کار کنند.
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = manifest.width * dprRef.current;
      canvas.height = manifest.height * dprRef.current;
      canvas.getContext("2d")?.scale(dprRef.current, dprRef.current);
    }

    const eagerCount = Math.min(
      mobile ? EAGER_MOBILE : EAGER_DESKTOP,
      manifest.count,
    );
    let loaded = 0;

    setReady(false);
    setLoadPercent(0);

    for (let i = 0; i < eagerCount; i++) {
      requestFrame(i, () => {
        if (cancelled) return;
        loaded++;
        setLoadPercent(Math.round((loaded / eagerCount) * 100));
        if (loaded === eagerCount) setReady(true);
      });
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
      const i = rest;
      rest++;
      requestFrame(i);
      idle(preloadNext);
    };
    idle(preloadNext);

    return () => {
      cancelled = true;
      cacheRef.current?.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- requestFrame از cacheRef/pendingRef می‌خواند، وابسته به manifest/mobile نیست جدا
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

  // حلقه‌ی rAF: disp را به‌سمت target ease می‌کند (ضریب ۰٫۱۲، hero-engine.ts)
  // و روی canvas دو فریم مجاور را با globalAlpha ترکیب می‌کند — هرگز
  // setState اینجا. اگر فریمی decode نشده، نزدیک‌ترین فریم کش‌شده جایگزین
  // می‌شود (nearestAvailableFrame)، نه جای خالی.
  useEffect(() => {
    let rafId: number;
    const maxIndex = manifest.count - 1;

    function loop() {
      dispRef.current = easeStep(dispRef.current, targetFrameRef.current);
      const canvas = canvasRef.current;
      const cache = cacheRef.current;

      if (canvas && cache) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const clamped = Math.min(maxIndex, Math.max(0, dispRef.current));
          const floorIndex = Math.floor(clamped);
          const frac = clamped - floorIndex;
          const ceilIndex = Math.min(maxIndex, floorIndex + 1);

          const drawFloor = nearestAvailableFrame(cache, floorIndex, maxIndex);
          const floorBitmap = cache.get(drawFloor);

          ctx.clearRect(0, 0, manifest.width, manifest.height);
          if (floorBitmap) {
            ctx.globalAlpha = 1;
            ctx.drawImage(floorBitmap, 0, 0, manifest.width, manifest.height);
          }
          if (frac > 0.01 && ceilIndex !== floorIndex) {
            const ceilBitmap = cache.get(ceilIndex);
            if (ceilBitmap) {
              ctx.globalAlpha = frac;
              ctx.drawImage(ceilBitmap, 0, 0, manifest.width, manifest.height);
              ctx.globalAlpha = 1;
            } else {
              requestFrame(ceilIndex);
            }
          }
          if (!floorBitmap) requestFrame(floorIndex);

          const band = bandAt(manifest.bands, dispRef.current);
          const { width, height } = panelSizeRef.current;
          canvas.style.transform = fitTransform({
            band,
            panelHeight: height || 1,
            panelWidth: width || 1,
            frameWidth: manifest.width,
            frameHeight: manifest.height,
          });
        }
      }

      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- requestFrame پایدار است (فقط از ref می‌خواند)
  }, [manifest]);

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
            {/* ابعاد واقعی بوم (اندازه‌ی backing store × dpr) imperative در
                effect بالا ست می‌شود، نه اینجا — dprRef یک ref است، تغییرش
                re-render نمی‌سازد تا این prop را به‌روز کند. */}
            <canvas
              ref={canvasRef}
              aria-hidden="true"
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
