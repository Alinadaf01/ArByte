import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@arbyte/contracts";
import type { ProductCard as ProductCardData } from "@arbyte/contracts";

interface SearchResultCardProps {
  product: ProductCardData;
}

/**
 * T-215 §۱ — کارت نتیجه‌ی جستجو، ساده‌تر از `ProductCard` (بدون بج
 * موجودی/چیپ مشخصه/دکمه‌ی سبد) — طبق سند تسک («نه ProductCard کامل، مگر
 * طراحی همان باشد»؛ اینجا نیست).
 */
export function SearchResultCard({ product }: SearchResultCardProps) {
  return (
    <Link
      href={`/products/${product.slug}?v=${product.defaultVariant.id}`}
      className="border-border hover:border-brand-tint-2 flex flex-col overflow-hidden rounded-card border bg-surface transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-popover"
    >
      <div className="bg-surface-muted relative aspect-[16/11] w-full">
        {product.image ? (
          <Image
            src={product.image.url}
            alt={product.image.alt ?? product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-contain p-4"
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4.5">
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
        <span
          dir="ltr"
          className="text-card-title text-primary font-heading mt-auto pt-1.5"
        >
          {formatPrice(BigInt(product.defaultVariant.price))}
        </span>
      </div>
    </Link>
  );
}
