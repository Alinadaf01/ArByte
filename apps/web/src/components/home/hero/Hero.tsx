import Link from "next/link";
import { formatNumberFa, homeHero, storeFacts } from "@arbyte/contracts";
import { IranMap } from "@/components/home/community/IranMap";
import { RoutePulses } from "@/components/home/community/route-pulses";

/**
 * جایگزین هیروی اسکرولی قبلی (ویدیوی ۲٫۵–۵ مگابایتی + موتور اسکراب
 * فریم‌به‌فریم با RAF). با اینترنت ضعیف/موبایل‌های کم‌توان در ایران آن
 * طراحی هم سنگین بود هم روی موبایل ناهماهنگ با ارتفاع واقعی هدر.
 *
 * این نسخه هیچ تصویر/ویدیویی دانلود نمی‌کند — کل بخش فقط متن + یک SVG
 * برداری (همان نقشه‌ی ایران صفحه‌ی «جامعه» + نقطه‌های نورانی SMIL روی
 * مسیرهای ارسال از تهران) است؛ وزن شبکه‌اش عملاً صفر و روی هر دستگاهی
 * با همان سرعت بار می‌شود. بدون اسکرول‌جکینگ — یک سکشن ایستای معمولی.
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

        <div className="relative mx-auto aspect-[640/380] w-full max-w-[560px]">
          <IranMap className="size-full" />
          <RoutePulses />
          {storeFacts.stats.deliveredOrders != null ? (
            <div className="border-border bg-surface shadow-popover absolute -bottom-3 start-2 flex items-center gap-2.5 rounded-panel border p-3 backdrop-blur-sm sm:start-6">
              <span
                aria-hidden="true"
                className="bg-brand-tint-1 flex size-9 shrink-0 items-center justify-center rounded-tile"
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-brand)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 4h2.2l2 11h9.3l2-8H7" />
                  <circle cx="9.5" cy="19" r="1.5" />
                  <circle cx="17" cy="19" r="1.5" />
                </svg>
              </span>
              <div className="flex flex-col">
                <span className="text-caption text-primary font-emphasis">
                  +{formatNumberFa(storeFacts.stats.deliveredOrders)}
                </span>
                <span className="text-micro text-secondary">
                  ارسال به سراسر ایران
                </span>
              </div>
            </div>
          ) : null}
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
