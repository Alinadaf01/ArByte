import Link from "next/link";
import { homeHero } from "@arbyte/contracts";

/**
 * جایگزین هیروی اسکرولی قبلی (ویدیوی ۲٫۵–۵ مگابایتی + موتور اسکراب
 * فریم‌به‌فریم با RAF). با اینترنت ضعیف/موبایل‌های کم‌توان در ایران آن
 * طراحی هم سنگین بود هم روی موبایل ناهماهنگ با ارتفاع واقعی هدر.
 *
 * بدون اسکرول‌جکینگ — یک سکشن ایستای معمولی. نسخه‌ی نقشه‌ی ایران (که
 * اینجا هم بود) برداشته شد — جایش را یک تصویر محصول واقعی می‌گیرد؛ تا
 * وقتی آن تصویر نرسیده، `HeroVisualPlaceholder` (یک SVG سبک، صفر وزن
 * شبکه) دقیقاً همان جای نهایی را پر می‌کند تا جایگزینی بعداً فقط یک
 * `<Image>` باشد.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden px-[5vw] py-14 md:py-20">
      <HeroAmbientBackground />

      <div className="relative mx-auto grid max-w-[1400px] items-center gap-10 md:grid-cols-2">
        <div className="flex flex-col items-start gap-4 text-right">
          <span className="bg-surface/90 text-caption text-brand font-emphasis inline-flex items-center gap-1.5 rounded-pill px-3 py-1">
            {homeHero.badgeNew} · {homeHero.badgeText}
          </span>
          <h1 className="text-hero text-primary font-heading leading-[1.3] tracking-tight text-balance">
            {homeHero.title}
          </h1>
          <p className="text-body text-secondary max-w-[52ch] leading-8">
            {homeHero.subtitle}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-2">
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

          <div className="mt-2 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
            {homeHero.steps.map((step) => (
              <div
                key={step.label}
                className="border-border bg-surface/80 rounded-panel border p-3"
              >
                <span className="text-caption text-brand font-emphasis">
                  {step.label}
                </span>
                <p className="text-caption text-primary mt-1 leading-5">
                  {step.title}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto aspect-[4/3] w-full max-w-[560px]">
          <HeroVisualPlaceholder />
        </div>
      </div>
    </section>
  );
}

/**
 * جای تصویر نهایی محصول تا وقتی برسد — یک ترکیب انتزاعی سبک (گرادیان +
 * چند کارت شناور)، صفر وزن شبکه. جایگزینی: این تابع را با یک
 * `<Image src="/hero/hero-visual.png" fill .../>` عوض کنید، همین
 * `div` بیرونی (aspect-[4/3]) را نگه دارید.
 */
function HeroVisualPlaceholder() {
  return (
    <div className="relative size-full">
      {/* کیف‌فریم محلی همین کامپوننت — طبق یادداشت packages/tokens/index.css
          («فقط مال یک صفحه‌اند، اینجا تعریف نشوند»)، در توکن‌های سراسری اضافه نشد. */}
      <style>{`
        @keyframes arb-hero-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
      <div
        aria-hidden="true"
        className="bg-brand/25 absolute left-1/2 top-1/2 size-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
      />
      <div className="motion-reduce:animate-none relative flex size-full items-center justify-center animate-[arb-hero-float_5s_ease-in-out_infinite]">
        <svg
          viewBox="0 0 400 300"
          className="h-[78%] w-[78%] drop-shadow-2xl"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="arbHeroScreen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--color-brand)" />
              <stop offset="100%" stopColor="var(--color-accent)" />
            </linearGradient>
          </defs>
          <rect
            x="54"
            y="26"
            width="292"
            height="186"
            rx="16"
            fill="var(--color-primary)"
          />
          <rect
            x="66"
            y="38"
            width="268"
            height="162"
            rx="8"
            fill="url(#arbHeroScreen)"
          />
          <rect
            x="86"
            y="58"
            width="130"
            height="10"
            rx="5"
            fill="var(--color-surface)"
            opacity="0.85"
          />
          <rect
            x="86"
            y="78"
            width="90"
            height="10"
            rx="5"
            fill="var(--color-surface)"
            opacity="0.6"
          />
          <path
            d="M70,236 L330,236 L358,256 L42,256 Z"
            fill="var(--color-secondary-2)"
            opacity="0.18"
          />
          <ellipse
            cx="200"
            cy="280"
            rx="110"
            ry="10"
            fill="var(--color-primary)"
            opacity="0.08"
          />
        </svg>
      </div>
    </div>
  );
}

function HeroAmbientBackground() {
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
      <div className="from-brand-tint-1 via-surface to-surface absolute inset-0 bg-gradient-to-b" />
      <div className="bg-brand-tint-3 absolute -top-24 end-[-10%] size-[36rem] rounded-full opacity-40 blur-3xl" />
      <div className="bg-accent/25 absolute bottom-[-15%] start-[-8%] size-[30rem] rounded-full opacity-40 blur-3xl" />
    </div>
  );
}
