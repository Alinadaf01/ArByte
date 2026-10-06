import Image from "next/image";
import Link from "next/link";
import { homeHero } from "@arbyte/contracts";

/**
 * جایگزین هیروی اسکرولی قبلی (ویدیوی ۲٫۵–۵ مگابایتی + موتور اسکراب
 * فریم‌به‌فریم با RAF). با اینترنت ضعیف/موبایل‌های کم‌توان در ایران آن
 * طراحی هم سنگین بود هم روی موبایل ناهماهنگ با ارتفاع واقعی هدر.
 *
 * بدون اسکرول‌جکینگ — یک سکشن ایستای معمولی. تصویر (public/hero/hero-visual.png)
 * یک PNG با آلفای واقعی است (نه پس‌زمینه‌ی سفید تخت) — `.trim()` شده
 * برای حذف حاشیه‌ی شفاف اضافه؛ next/image خودش فرمت/سایز مناسب هر
 * دستگاه را تولید می‌کند.
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
          <div
            aria-hidden="true"
            className="bg-brand/25 absolute left-1/2 top-1/2 size-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          />
          <Image
            src="/hero/hero-visual.png"
            alt=""
            fill
            priority
            sizes="(max-width: 768px) 80vw, 560px"
            className="motion-reduce:animate-none object-contain drop-shadow-2xl animate-[arb-hero-float_5s_ease-in-out_infinite]"
          />
          {/* کیف‌فریم محلی همین کامپوننت — طبق یادداشت packages/tokens/index.css
              («فقط مال یک صفحه‌اند، اینجا تعریف نشوند»)، در توکن‌های سراسری اضافه نشد. */}
          <style>{`
            @keyframes arb-hero-float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
          `}</style>
        </div>
      </div>
    </section>
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
