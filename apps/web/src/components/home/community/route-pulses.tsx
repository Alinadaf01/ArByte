"use client";

import { usePrefersReducedMotion } from "@/lib/hooks";

/**
 * مختصات/مسیرها عیناً از `IranMap.tsx` (تولیدشده‌ی `map:build`) کپی شده‌اند —
 * آن فایل دستی ویرایش نمی‌شود (هشدار بالای خودش)، پس این لایه‌ی جدا روی آن
 * قرار می‌گیرد، نه داخلش. اگر نقشه دوباره ساخته شد و مسیرها عوض شدند، این
 * آرایه هم باید به‌دست به‌روز شود.
 */
const ROUTES: readonly string[] = [
  "M275.7,121.0 Q296.2,117.7 307.6,100.3",
  "M275.7,121.0 Q357.2,148.3 432.3,106.7",
  "M275.7,121.0 Q265.4,131.1 265.9,145.4",
  "M275.7,121.0 Q263.0,157.2 281.0,191.0",
  "M275.7,121.0 Q256.2,194.8 297.5,259.1",
  "M275.7,121.0 Q282.8,235.5 368.9,311.2",
];

/**
 * نقطه‌های نورانی‌ای که روی مسیرهای ارسال از تهران رفت‌وبرگشت می‌کنند —
 * فقط SVG SMIL (`animateMotion`)، صفر جاوااسکریپت در هر فریم، صفر وزن
 * شبکه‌ی اضافه (همان مسیرهای نقشه‌ی موجود). `prefers-reduced-motion` را
 * رعایت می‌کند.
 */
export function RoutePulses({
  count = ROUTES.length,
  className,
}: {
  count?: number;
  className?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  if (reducedMotion) return null;

  return (
    <svg
      viewBox="0 0 640 380"
      className={`pointer-events-none absolute inset-0 size-full ${className ?? ""}`}
      aria-hidden="true"
    >
      {ROUTES.slice(0, count).map((d, i) => (
        <circle key={i} r={3.2} fill="var(--color-accent)">
          <animateMotion
            dur="3.4s"
            begin={`${i * 0.5}s`}
            repeatCount="indefinite"
            path={d}
          />
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            keyTimes="0;0.08;0.85;1"
            dur="3.4s"
            begin={`${i * 0.5}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </svg>
  );
}
