import Image from "next/image";
import Link from "next/link";
import { formatPrice, homeFeatured, homePage } from "@arbyte/contracts";
import type { PublicHomepageBlock } from "@arbyte/contracts";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import {
  AVAILABILITY_TEXT_TONE,
  availabilityLabel,
  availabilityTone,
} from "@/lib/labels";

interface FeaturedSectionProps {
  block: Extract<PublicHomepageBlock, { type: "PRODUCT_RAIL" }>;
}

/**
 * T-212 §۱ — «محصولات منتخب»: یک کارت بزرگ + بقیه کوچک، از بلوک PRODUCT_RAIL
 * پنل (ترتیب پنل؛ اولی کارت بزرگ). منطق قیمت/موجودی/سبد از همان
 * helperهای `ProductCard` می‌آید (`@/lib/labels`, `AddToCartButton`) —
 * تکرار نشده، فقط چیدمان طراحی این بخش فرق دارد.
 */
export function FeaturedSection({ block }: FeaturedSectionProps) {
  const [big, ...small] = block.products;
  if (!big) return null;

  const bigAvailability = big.defaultVariant.availability;

  return (
    <section className="bg-paper border-border border-t px-[5vw] py-14 md:py-20">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <h2 className="text-h2 text-primary font-heading tracking-tight">
          {block.title ?? homePage.featuredTitle}
        </h2>
        <Link
          href="/products"
          className="text-body text-primary font-emphasis hover:text-brand"
        >
          {homeFeatured.viewShopCta}
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        <article className="border-border grid grid-cols-1 overflow-hidden rounded-card-lg border md:grid-cols-2">
          <div className="from-brand-tint-1 to-brand-tint-3 relative min-h-60 bg-gradient-to-br">
            {big.image ? (
              <Image
                src={big.image.url}
                alt={big.image.alt ?? big.name}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain p-6"
              />
            ) : null}
          </div>
          <div className="flex flex-col justify-center gap-4 p-6 md:p-10">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="bg-surface-dark text-on-dark rounded-pill px-3.5 py-1.5 text-caption font-emphasis whitespace-nowrap">
                {homeFeatured.expertPickBadge}
              </span>
              <span className="text-caption text-secondary">
                {homeFeatured.testedHint}
              </span>
            </div>
            <h3 className="text-subhead text-primary font-heading leading-8 tracking-tight">
              {big.name}
            </h3>
            {big.keySpecs.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {big.keySpecs.map((spec) => (
                  <span
                    key={spec.name}
                    className="bg-surface border-border text-secondary-2 rounded-tile-sm border px-3 py-1.5 text-caption whitespace-nowrap"
                  >
                    {spec.value}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-1 flex flex-wrap items-center gap-3.5">
              <span
                dir="ltr"
                className="text-subhead text-primary font-heading whitespace-nowrap"
              >
                {formatPrice(BigInt(big.defaultVariant.price))}
              </span>
              <AddToCartButton
                variantId={big.defaultVariant.id}
                productSlug={big.slug}
                outOfStock={bigAvailability.status === "OUT_OF_STOCK"}
              />
              <Link
                href={`/products/${big.slug}`}
                className="text-body text-primary font-emphasis hover:text-brand"
              >
                {homeFeatured.fullDetailsCta}
              </Link>
            </div>
          </div>
        </article>

        {/* بلوک «ردیف محصولات» پنل: اولی کارت بزرگ، بقیه کوچک (۴ محصول = ۱+۳). */}
        <div
          className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${small.length % 3 === 0 ? "lg:grid-cols-3" : ""}`}
        >
          {small.map((product) => {
            const availability = product.defaultVariant.availability;
            return (
              <article
                key={product.id}
                className="border-border hover:border-brand-tint-2 flex flex-col overflow-hidden rounded-card border transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-popover"
              >
                <div className="bg-surface-muted relative aspect-[16/11]">
                  {product.image ? (
                    <Image
                      src={product.image.url}
                      alt={product.image.alt ?? product.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-contain p-4"
                    />
                  ) : null}
                  <span
                    className={`bg-surface border-border pointer-events-none absolute end-3.5 top-3.5 rounded-pill border px-3 py-1 text-caption font-emphasis whitespace-nowrap ${AVAILABILITY_TEXT_TONE[availabilityTone(availability)]}`}
                  >
                    {availabilityLabel(availability)}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-3.5 p-5">
                  <span className="text-caption text-brand font-emphasis">
                    {product.category.name}
                  </span>
                  <h3 className="text-card-title text-primary font-heading leading-7">
                    {product.name}
                  </h3>
                  {product.keySpecs.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {product.keySpecs.slice(0, 3).map((spec) => (
                        <span
                          key={spec.name}
                          className="bg-surface border-border text-secondary-2 rounded-tile-sm border px-3 py-1.5 text-caption whitespace-nowrap"
                        >
                          {spec.value}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-1">
                    <span
                      dir="ltr"
                      className="text-card-title text-primary font-heading"
                    >
                      {formatPrice(BigInt(product.defaultVariant.price))}
                    </span>
                    <AddToCartButton
                      variantId={product.defaultVariant.id}
                      productSlug={product.slug}
                      outOfStock={availability.status === "OUT_OF_STOCK"}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
