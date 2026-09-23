"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatPrice, homeFlagships } from "@arbyte/contracts";
import type { PublicHomepageBlock } from "@arbyte/contracts";
import { parseMetricMagnitude, relativeBarPercent } from "./metric-bar";

interface FlagshipDuelProps {
  block: Extract<PublicHomepageBlock, { type: "FLAGSHIP_DUEL" }>;
}

/**
 * T-211 §۴ — «دو پرچم‌دار، یک انتخاب»، Home.dc.html خط ~۲۶۸. دسکتاپ هر دو
 * ستون همیشه کنار هم دیده می‌شوند؛ فقط موبایل تک‌ستونه با تب‌سوییچر است
 * (⚠️ tabهای طراحی مخصوص موبایل‌اند، نه دسکتاپ). نوار متریک یک‌بار با
 * IntersectionObserver پر می‌شود، نه روی هر رندر.
 */
export function FlagshipDuel({ block }: FlagshipDuelProps) {
  const [tab, setTab] = useState<0 | 1>(0);
  const [revealed, setRevealed] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const metricLabels = new Set(block.metrics.map((metric) => metric.label));

  const metricsWithPercent = block.metrics.map((metric) => {
    const magA = parseMetricMagnitude(metric.values[0]);
    const magB = parseMetricMagnitude(metric.values[1]);
    const max = Math.max(magA, magB);
    return {
      label: metric.label,
      values: metric.values,
      percents: [
        relativeBarPercent(magA, max),
        relativeBarPercent(magB, max),
      ] as [number, number],
    };
  });

  return (
    <section
      ref={sectionRef}
      className="bg-surface-dark text-on-dark px-[5vw] py-16 md:py-24"
    >
      <div className="mb-8 flex flex-col gap-2 text-center">
        <h2 className="text-h2 font-heading tracking-tight">
          {block.title ?? homeFlagships.title}
        </h2>
        {block.subtitle ? (
          <p className="text-on-dark-secondary text-body mx-auto max-w-[60ch]">
            {block.subtitle}
          </p>
        ) : null}
      </div>

      {/* تب‌سوییچر — فقط موبایل. */}
      <div className="mb-6 flex justify-center gap-2 md:hidden">
        {block.products.map((product, i) => (
          <button
            key={product.id}
            type="button"
            onClick={() => setTab(i as 0 | 1)}
            className={
              tab === i
                ? "bg-surface text-primary rounded-pill px-4 py-2 text-caption font-emphasis"
                : "text-on-dark-secondary rounded-pill px-4 py-2 text-caption font-emphasis"
            }
          >
            {product.brand.name}
          </button>
        ))}
      </div>

      <div className="grid gap-px overflow-hidden rounded-card-lg md:grid-cols-2">
        {block.products.map((product, i) => (
          <div
            key={product.id}
            className={`bg-surface-dark md:flex flex-col gap-5 p-6 md:p-10 ${
              tab === i ? "flex" : "hidden"
            }`}
          >
            <div className="bg-surface-muted relative aspect-[4/3] w-full overflow-hidden rounded-panel">
              {product.image ? (
                <Image
                  src={product.image.url}
                  alt={product.image.alt ?? product.name}
                  fill
                  sizes="(max-width: 768px) 90vw, 40vw"
                  className="object-contain p-4"
                />
              ) : null}
            </div>

            <div>
              <h3 className="text-card-title font-heading">{product.name}</h3>
              {homeFlagships.taglines[i] ? (
                <p className="text-on-dark-secondary text-body mt-1">
                  {homeFlagships.taglines[i]}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-4">
              {metricsWithPercent.map((metric) => (
                <div key={metric.label} className="flex flex-col gap-1.5">
                  <div className="text-caption text-on-dark-secondary flex items-center justify-between">
                    <span>{metric.label}</span>
                    <span className="font-emphasis">{metric.values[i]}</span>
                  </div>
                  <div className="bg-surface/15 h-1.5 overflow-hidden rounded-pill">
                    <div
                      className="bg-accent h-full rounded-pill transition-[width] duration-700 ease-out motion-reduce:transition-none"
                      style={{
                        width: `${revealed ? metric.percents[i] : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {/* مشخصه‌هایی که همین بالا به‌صورت نوار متریک نشان داده شده‌اند اینجا تکرار نمی‌شوند. */}
              {product.keySpecs
                .filter((spec) => !metricLabels.has(spec.name))
                .map((spec) => (
                  <span
                    key={spec.name}
                    className="border-border-done text-on-dark-secondary text-caption rounded-pill border px-3 py-1.5"
                  >
                    {spec.value}
                  </span>
                ))}
            </div>

            <div className="mt-auto flex flex-wrap items-center gap-3">
              <span className="text-body font-emphasis">
                {formatPrice(BigInt(product.defaultVariant.price))}
              </span>
              <div className="flex gap-2">
                <Link
                  href={`/products/${product.slug}`}
                  className="bg-surface text-primary hover:bg-surface-muted rounded-pill px-5 py-2.5 text-caption font-emphasis transition-colors duration-200"
                >
                  {homeFlagships.viewAndBuyCta}
                </Link>
                <Link
                  href={`/products/${product.slug}#specs`}
                  className="border-border-done text-on-dark hover:bg-surface/10 rounded-pill border px-5 py-2.5 text-caption font-emphasis transition-colors duration-200"
                >
                  {homeFlagships.fullSpecsCta}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
