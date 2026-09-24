"use client";

import { useState } from "react";
import Image from "next/image";
import type { PublicProductDetail } from "@arbyte/contracts";

interface ProductGalleryProps {
  productName: string;
  images: PublicProductDetail["images"];
}

/**
 * T-214 §۱ — گالری با انتخابگر thumbnail. با یک تصویر، ردیف thumbnail
 * پنهان می‌شود (§۲). تصویر اول `priority` (LCP)، بقیه lazy.
 */
export function ProductGallery({ productName, images }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex] ?? images[0];

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="bg-surface-muted border-border relative aspect-[4/3] w-full overflow-hidden rounded-card-lg border">
        {active ? (
          <Image
            src={active.url}
            alt={active.alt ?? productName}
            fill
            priority={activeIndex === 0}
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain p-6"
          />
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="grid grid-cols-4 gap-2.5">
          {images.map((image, index) => (
            <button
              key={image.url}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={image.alt ?? productName}
              aria-current={index === activeIndex}
              className={`bg-surface-muted aspect-square overflow-hidden rounded-tile border-2 p-1.5 transition-colors duration-200 ${
                index === activeIndex ? "border-brand" : "border-border"
              }`}
            >
              <Image
                src={image.url}
                alt=""
                width={100}
                height={100}
                className="h-full w-full object-contain"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
