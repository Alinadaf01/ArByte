import Image from "next/image";
import Link from "next/link";
import type { PublicHomepageBlock } from "@arbyte/contracts";

interface HeroSectionProps {
  block: Extract<PublicHomepageBlock, { type: "HERO" }>;
}

/**
 * T-201 §۳ — تصویر هیرو LCP صفحه است: `priority` (بدون lazy) و `sizes`
 * درست دارد. دسکتاپ/موبایل دو فایل جدایند (نه یک تصویر با سایز متفاوت) —
 * چون `next/image` خودش art-direction ندارد، دو `<Image>` با نمایش
 * ریسپانسیو (`hidden md:block` / `md:hidden`) رندر می‌شود، الگوی مستند
 * خودِ Next.js برای این حالت. وقتی هیچ‌کدام نیست (فعلاً پیش از این تسک —
 * عکس واقعی هنوز نرسیده، ر.ک. گزارش)، پس‌زمینه‌ی گرادیانی طراحی
 * (`Home.dc.html`، بدون نیاز به فایل تصویر) جایگزین می‌شود تا صفحه نشکند.
 */
export function HeroSection({ block }: HeroSectionProps) {
  const alt = block.imageAlt ?? block.title ?? "";

  return (
    <section className="bg-paper relative overflow-hidden px-[5vw] py-16 md:py-24">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(52% 48% at 50% 40%, rgba(108,77,255,.16) 0%, rgba(246,244,252,0) 70%)",
        }}
      />

      {block.imageDesktop || block.imageMobile ? (
        <div className="relative mb-8 aspect-[5/6] w-full overflow-hidden rounded-card-lg md:aspect-[21/9]">
          {block.imageDesktop ? (
            <Image
              src={block.imageDesktop}
              alt={alt}
              fill
              priority
              sizes="90vw"
              className="hidden object-cover md:block"
            />
          ) : null}
          {block.imageMobile ? (
            <Image
              src={block.imageMobile}
              alt={alt}
              fill
              priority
              sizes="90vw"
              className="object-cover md:hidden"
            />
          ) : null}
        </div>
      ) : null}

      <div className="relative flex flex-col items-start gap-4 text-right">
        {block.title ? (
          <h1 className="text-hero text-primary font-heading leading-[1.3] tracking-tight text-balance">
            {block.title}
          </h1>
        ) : null}
        {block.subtitle ? (
          <p className="text-body text-secondary max-w-[60ch] leading-8">
            {block.subtitle}
          </p>
        ) : null}
        {block.ctaLabel && block.ctaUrl ? (
          <Link
            href={block.ctaUrl}
            className="bg-primary text-on-dark hover:bg-brand mt-2 rounded-pill px-6 py-3 text-body font-emphasis transition-colors duration-200"
          >
            {block.ctaLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
