"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatNumberFa, homeHero } from "@arbyte/contracts";
import { usePrefersReducedMotion } from "@/lib/hooks";
import {
  activeStep,
  bandAt,
  easeStep,
  fitTransform,
  frameToTime,
  HERO_STEP_RANGES,
  type HeroManifest,
} from "./hero-engine";

const STEP_COUNT = homeHero.steps.length;
const MOBILE_QUERY = "(max-width: 767px)";
/** باید دقیقاً با ارتفاع هدر چسبان SiteHeader یکی باشد: موبایل h-14 (۵۶px)،
 * دسکتاپ h-18 (۷۲px، ≥۷۶۸px همان MOBILE_QUERY). قبلاً همیشه ۷۲ بود — روی
 * موبایل یعنی پنل چسبان ۱۶px پایین‌تر از لبه‌ی واقعی هدر می‌نشست و یک شکاف
 * قابل‌دیدن زیر هدر، بین هدر و محتوای هیرو، باز می‌شد. */
function headerHeightPx(): number {
  if (typeof window === "undefined") return 72;
  return window.matchMedia(MOBILE_QUERY).matches ? 56 : 72;
}
/** بعد از `load`، اگر کاربر هنوز اسکرول نکرده، ویدیو در این مهلت idle شروع می‌شود. */
const VIDEO_IDLE_TIMEOUT_MS = 2500;

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
  const headerHeight = headerHeightPx();
  const denom = rect.height - (viewportH - headerHeight);
  if (denom <= 0) return 0;
  return clamp01((headerHeight - rect.top) / denom);
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

/** پوستر هر breakpoint با `<picture>` — بدون JS، پیش از hydration درست است. */
function HeroPicture({
  pair,
  priority,
  className,
}: {
  pair: HeroManifest["poster"];
  priority?: boolean;
  className?: string;
}) {
  return (
    <picture>
      <source media={MOBILE_QUERY} srcSet={pair.mobile} type="image/avif" />
      <img
        src={pair.desktop}
        alt=""
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        className={className}
      />
    </picture>
  );
}

/** manifest هست ولی prefers-reduced-motion — آخرین فریم ثابت، بدون اسکراب و بدون ویدیو. */
function HeroStatic({ manifest }: { manifest: HeroManifest }) {
  return (
    <section className="relative overflow-hidden px-[5vw] py-16 md:py-24">
      <HeroAmbientBackground />
      <div className="relative mx-auto flex max-w-[1400px] flex-col gap-10">
        <HeroHeading />
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-card-lg">
          <HeroPicture
            pair={manifest.posterEnd}
            className="size-full object-contain mix-blend-multiply"
          />
        </div>
        <HeroStepCardsStatic />
        <HeroCtaBar currentStep={STEP_COUNT - 1} />
      </div>
    </section>
  );
}

const MP4_TYPE = 'video/mp4; codecs="avc1.640028"';
const WEBM_TYPE = 'video/webm; codecs="vp9"';

/** فقط یک فایل انتخاب می‌شود: MP4 (H.264) و اگر نبود WebM (VP9). */
function pickVideoSource(
  video: HTMLVideoElement,
  manifest: HeroManifest,
): string | null {
  const key = window.matchMedia(MOBILE_QUERY).matches ? "mobile" : "desktop";
  if (video.canPlayType(MP4_TYPE)) return manifest.video[key];
  if (manifest.videoWebm && video.canPlayType(WEBM_TYPE)) {
    return manifest.videoWebm[key];
  }
  return null;
}

function saveDataRequested(): boolean {
  const conn = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  return !!conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? "");
}

/**
 * AUDIT-4 — حالت اسکراب با **یک ویدیوی کوتاه** (به‌جای ۲۲۰ فریم WebP جدا که
 * ۳ تا ۱۱ مگابایت در چند ثانیه‌ی اول می‌کشیدند و تا decode ۶۰/۲۸ فریم یک پوشش
 * «بارگذاری ٪» روی هیرو بود). حالا:
 * - پوستر AVIF فریم اول بلافاصله (preload در HeroSection) و عنوان هرگز پوشانده نمی‌شود؛
 * - ویدیو (GOP=2، seek نرم) فقط با اولین اسکرول/لمس یا بعد از `load`+idle شروع
 *   می‌شود تا با تصاویر دسته‌ها و منابع اولیه رقابت نکند؛ Save-Data/2G = فقط پوستر؛
 * - اسکرول پنجره → `video.currentTime` (نه setState به‌ازای هر فریم)، فقط وقتی
 *   هیرو در دید است حلقه‌ی rAF می‌چرخد؛
 * - کادربندی (bands/fitTransform) همان طراحی قبلی، روی یک لایه‌ی مشترک پوستر+ویدیو.
 */
function HeroScrollEngine({ manifest }: { manifest: HeroManifest }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const visualRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);

  const targetFrameRef = useRef(0);
  const dispRef = useRef(0);
  const lastSeekRef = useRef(-1);
  const videoReadyRef = useRef(false);
  const panelSizeRef = useRef({ width: 0, height: 0 });
  const lastTransformRef = useRef("");
  const visibleRef = useRef(true);
  const actRef = useRef(0);
  const startedRef = useRef(false);

  const [act, setAct] = useState(0);
  const [started, setStarted] = useState(false);
  const [positioned, setPositioned] = useState(false);
  const [videoShown, setVideoShown] = useState(false);

  // ویدیو: فقط با تعامل کاربر یا پس از load + idle. هیچ درخواستی پیش از آن.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || saveDataRequested()) return;
    let begun = false;
    const events = ["scroll", "touchstart", "pointerdown", "keydown"] as const;

    function begin() {
      if (begun || !video) return;
      begun = true;
      detach();
      const src = pickVideoSource(video, manifest);
      if (!src) return; // هیچ کُدکی پشتیبانی نمی‌شود → پوستر می‌ماند
      video.src = src;
      // با preload="none" مرورگر پس از load() هیچ بایتی نمی‌گیرد و loadedmetadata
      // (پیش‌نیاز seek) هرگز نمی‌رسد؛ از این لحظه دانلود عمداً آغاز می‌شود.
      video.preload = "auto";
      video.load();
    }
    function detach() {
      events.forEach((e) => window.removeEventListener(e, begin));
      window.removeEventListener("load", afterLoad);
    }
    function afterLoad() {
      const w = window as Window & {
        requestIdleCallback?: (
          cb: () => void,
          o?: { timeout: number },
        ) => number;
      };
      if (typeof w.requestIdleCallback === "function") {
        w.requestIdleCallback(begin, { timeout: VIDEO_IDLE_TIMEOUT_MS });
      } else {
        window.setTimeout(begin, VIDEO_IDLE_TIMEOUT_MS);
      }
    }

    events.forEach((e) =>
      window.addEventListener(e, begin, { passive: true, once: true }),
    );
    if (document.readyState === "complete") afterLoad();
    else window.addEventListener("load", afterLoad, { once: true });

    function onMeta() {
      videoReadyRef.current = true;
      lastSeekRef.current = -1; // اولین حلقه همان فریم فعلی را seek کند
    }
    function onSeeked() {
      setVideoShown(true);
    }
    function onError() {
      videoReadyRef.current = false; // پوستر می‌ماند؛ صفحه نمی‌شکند
    }
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    return () => {
      detach();
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };
  }, [manifest]);

  // اندازه‌ی پنل فقط روی mount/resize؛ حلقه فقط وقتی هیرو در دید است.
  useEffect(() => {
    function updatePanelSize() {
      const el = panelRef.current;
      if (!el) return;
      panelSizeRef.current = { width: el.clientWidth, height: el.clientHeight };
      lastTransformRef.current = "";
    }
    updatePanelSize();
    window.addEventListener("resize", updatePanelSize);
    const io = new IntersectionObserver(([entry]) => {
      visibleRef.current = !!entry?.isIntersecting;
    });
    if (wrapperRef.current) io.observe(wrapperRef.current);
    return () => {
      window.removeEventListener("resize", updatePanelSize);
      io.disconnect();
    };
  }, []);

  // اسکرول پنجره: progress مستقیم از rect.
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

  // حلقه‌ی rAF: disp را ease می‌کند، ویدیو را seek و لایه را کادربندی می‌کند.
  useEffect(() => {
    let rafId: number;
    const maxIndex = manifest.count - 1;

    function loop() {
      rafId = requestAnimationFrame(loop);
      if (!visibleRef.current && lastTransformRef.current) return;

      dispRef.current = easeStep(dispRef.current, targetFrameRef.current);
      const frame = Math.min(maxIndex, Math.max(0, dispRef.current));
      const video = videoRef.current;
      const ready = videoReadyRef.current && !!video;

      if (
        ready &&
        video &&
        !video.seeking &&
        Math.abs(frame - lastSeekRef.current) >= 0.5
      ) {
        lastSeekRef.current = frame;
        video.currentTime = frameToTime(frame, manifest.fps, video.duration);
      }

      // تا ویدیو آماده نیست پوستر (فریم ۰) است، پس کادربندی هم فریم ۰.
      const band = bandAt(manifest.bands, ready ? frame : 0);
      const { width, height } = panelSizeRef.current;
      const transform = fitTransform({
        band,
        panelHeight: height || 1,
        panelWidth: width || 1,
        frameWidth: manifest.width,
        frameHeight: manifest.height,
      });
      if (transform !== lastTransformRef.current && visualRef.current) {
        visualRef.current.style.transform = transform;
        if (!lastTransformRef.current) setPositioned(true);
        lastTransformRef.current = transform;
      }
    }

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [manifest]);

  return (
    <div ref={wrapperRef} className="relative h-[230vh] md:h-[360vh]">
      <div
        ref={panelRef}
        className="sticky top-14 h-[calc(100dvh-56px)] overflow-hidden px-[5vw] py-10 md:top-[72px] md:h-[calc(100dvh-72px)] md:py-16"
      >
        <HeroAmbientBackground />

        <div className="relative mx-auto flex h-full max-w-[1400px] flex-col justify-between gap-6">
          <HeroHeading />

          <div className="relative min-h-0 flex-1">
            <div
              ref={visualRef}
              data-hero-visual
              data-pending={positioned ? undefined : ""}
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 left-1/2 h-full max-w-none origin-bottom mix-blend-multiply transition-opacity duration-300"
              style={{
                aspectRatio: `${manifest.width} / ${manifest.height}`,
                opacity: positioned ? 1 : 0,
              }}
            >
              <HeroPicture
                pair={manifest.poster}
                priority
                className="absolute inset-0 size-full"
              />
              <video
                ref={videoRef}
                muted
                playsInline
                preload="none"
                disablePictureInPicture
                disableRemotePlayback
                tabIndex={-1}
                className="absolute inset-0 size-full"
                style={{ opacity: videoShown ? 1 : 0 }}
              />
            </div>

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
      </div>
    </div>
  );
}
