import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@arbyte/contracts";
import type { ProductCard as ProductCardData } from "@arbyte/contracts";
import {
  AVAILABILITY_TEXT_TONE,
  availabilityLabel,
  availabilityTone,
} from "@/lib/labels";
import { AddToCartButton } from "./AddToCartButton";

interface ProductCardProps {
  product: ProductCardData;
  /** اندازه‌ی responsive تصویر — بسته به بافت (گرید فروشگاه، ریل صفحه اصلی و ...) فرق می‌کند. */
  imageSizes?: string;
  /** T-202 §۴ — فقط ردیف اول گرید محصولات؛ بقیه lazy (پیش‌فرض next/image). */
  priority?: boolean;
}

/**
 * بند ۵.۳۳ + T-213 §۷ — هم‌تراز `Products.dc.html` (گرید فروشگاه). همه‌ی
 * مصرف‌کننده‌های ProductCard (دسته، جستجو، علاقه‌مندی) همین نسخه را
 * می‌گیرند — کارت جدا نساز.
 *
 * ⚠️ کل کارت یک لینک به صفحه محصول است (حتی وقتی ناموجود) — الگوی
 * «stretched link». لینک `?v=<defaultVariant.id>` دارد: وقتی فیلتر
 * مشخصه‌ی محور فعال است، `defaultVariant` همان واریانت *منطبق* است (نه
 * پیش‌فرض واقعی محصول — ر.ک. `selectCardVariant` در قرارداد)، پس صفحه‌ی
 * محصول باید دقیقاً همان پیکربندی را باز کند.
 *
 * ⚠️ «اطلاع از موجودی» طراحی حذف شد — مدل داده‌ای برایش نداریم (Q در
 * QUESTIONS.md، T-213 §۷). کارت ناموجود فقط پیل وضعیت را نشان می‌دهد،
 * بدون دکمه‌ی جایگزین.
 */
export function ProductCard({
  product,
  imageSizes,
  priority,
}: ProductCardProps) {
  const href = `/products/${product.slug}?v=${product.defaultVariant.id}`;
  const priceLabel = formatPrice(BigInt(product.defaultVariant.price));
  const availability = product.defaultVariant.availability;
  const outOfStock = availability.status === "OUT_OF_STOCK";

  return (
    <article className="border-border hover:border-brand-tint-2 relative flex h-full flex-col overflow-hidden rounded-card border transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-popover">
      {/* z-[1]: باید بالاتر از کانتینر عکس (relative برای next/image fill، بدون
          z-index خودش یعنی هم‌سطح z-0) بنشیند وگرنه کلیک روی عکس را می‌قاپد؛
          هنوز پایین‌تر از دکمه‌های تعاملی واقعی کارت (AddToCartButton: z-10). */}
      <Link
        href={href}
        aria-label={product.name}
        className="absolute inset-0 z-[1]"
      />

      <div className="bg-surface-muted relative aspect-[16/11] w-full shrink-0">
        {product.image ? (
          <Image
            src={product.image.url}
            alt={product.image.alt ?? product.name}
            fill
            priority={priority}
            sizes={imageSizes ?? "(max-width: 768px) 50vw, 25vw"}
            className="object-contain p-4"
          />
        ) : null}
        <span
          className={`bg-surface border-border pointer-events-none absolute end-3 top-3 rounded-pill border px-2.5 py-1 text-caption font-emphasis whitespace-nowrap ${AVAILABILITY_TEXT_TONE[availabilityTone(availability)]}`}
        >
          {availabilityLabel(availability)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-caption text-brand font-emphasis">
            {product.category.name}
          </span>
          <span
            dir="ltr"
            className="text-caption text-secondary-2 font-emphasis"
          >
            {product.brand.name}
          </span>
        </div>

        <h3 className="text-card-title text-primary font-heading line-clamp-2 leading-6 tracking-tight">
          {product.name}
        </h3>

        {product.keySpecs.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {product.keySpecs.slice(0, 3).map((spec) => (
              <span
                key={spec.name}
                className="bg-surface border-border text-secondary-2 rounded-tile-sm border px-2.5 py-1 text-caption whitespace-nowrap"
              >
                {spec.value}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2.5 pt-1.5">
          <span dir="ltr" className="text-card-title text-primary font-heading">
            {priceLabel}
          </span>
          {outOfStock ? null : (
            <AddToCartButton
              variantId={product.defaultVariant.id}
              productSlug={product.slug}
              outOfStock={outOfStock}
            />
          )}
        </div>
      </div>
    </article>
  );
}
