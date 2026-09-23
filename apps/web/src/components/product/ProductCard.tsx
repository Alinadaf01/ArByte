import Image from "next/image";
import Link from "next/link";
import { Badge, Card } from "@arbyte/ui";
import { cta as ctaText, formatPrice } from "@arbyte/contracts";
import type { ProductCard as ProductCardData } from "@arbyte/contracts";
import {
  availabilityLabel,
  availabilityTone,
  CONDITION_LABEL,
} from "@/lib/labels";

interface ProductCardProps {
  product: ProductCardData;
  /** اندازه‌ی responsive تصویر — بسته به بافت (گرید فروشگاه، ریل صفحه اصلی و ...) فرق می‌کند. */
  imageSizes?: string;
}

/**
 * بند ۵.۳۳ + طراحی — مهم‌ترین کامپوننت فروشگاه؛ در صفحه اصلی، دسته‌بندی،
 * جستجو، علاقه‌مندی، مقایسه و محصولات مرتبط استفاده می‌شود.
 *
 * ⚠️ کل کارت یک لینک به صفحه محصول است (حتی وقتی ناموجود) — الگوی
 * «stretched link»: `Link` با `absolute inset-0` پشت محتوا می‌نشیند، فقط
 * CTA لایه‌ی بالاتر (`z-10`) خودش را دارد تا در آینده بدون شکستن ساختار
 * بتواند منطق واقعی سبد خرید بگیرد بدون تو در تو شدن `<button>` داخل `<a>`.
 */
export function ProductCard({ product, imageSizes }: ProductCardProps) {
  const href = `/products/${product.slug}`;
  const priceLabel = formatPrice(BigInt(product.defaultVariant.price));
  const availability = product.defaultVariant.availability;
  const outOfStock = availability.status === "OUT_OF_STOCK";

  return (
    <Card
      variant="interactive"
      padding={false}
      className="relative flex h-full flex-col overflow-hidden"
    >
      <Link
        href={href}
        aria-label={product.name}
        className="absolute inset-0 z-0"
      />

      <div className="relative aspect-[4/3] w-full shrink-0 bg-surface-muted">
        {product.image ? (
          <Image
            src={product.image.url}
            alt={product.image.alt ?? product.name}
            fill
            sizes={imageSizes ?? "(max-width: 768px) 50vw, 25vw"}
            className="object-contain p-4"
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <Badge tone="neutral">{CONDITION_LABEL[product.condition]}</Badge>
        </div>

        <h3 className="text-card-title text-primary font-heading line-clamp-2 leading-6">
          {product.name}
        </h3>

        {product.keySpecs.length > 0 ? (
          <ul
            dir="ltr"
            className="text-caption text-secondary flex flex-wrap gap-x-3 gap-y-1"
          >
            {product.keySpecs.slice(0, 4).map((spec) => (
              <li key={spec.name} className="flex items-center gap-1">
                {spec.value}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-auto flex flex-col gap-3 pt-1">
          <span
            dir="ltr"
            className="text-card-title text-primary font-heading text-right"
          >
            {priceLabel}
          </span>

          <div className="flex items-center justify-between gap-3">
            <Badge tone={availabilityTone(availability)}>
              {availabilityLabel(availability)}
            </Badge>

            <button
              type="button"
              disabled={outOfStock}
              className="relative z-10 rounded-pill bg-primary text-on-dark disabled:pointer-events-none disabled:opacity-50 hover:opacity-90 px-4 py-2 text-caption font-emphasis whitespace-nowrap transition-opacity duration-200"
            >
              {ctaText.addToCart}
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
