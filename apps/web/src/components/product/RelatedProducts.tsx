import Link from "next/link";
import { productDetailPage } from "@arbyte/contracts";
import { ProductCard } from "@/components/product/ProductCard";
import { getProducts } from "@/lib/catalog";

interface RelatedProductsProps {
  categorySlug: string;
  categoryName: string;
  excludeSlug: string;
}

const RELATED_COUNT = 4;

/**
 * T-214 §۲ — چهار محصول هم‌رده. `perPage` یکی بیشتر از نیاز گرفته می‌شود تا
 * بعد از حذف خودِ محصول، باز هم به عدد کامل برسیم (بدون نیاز به پارامتر
 * `exclude` در API — فیلتر سمت فرانت، فقط‌خواندنی، بدون تغییر قرارداد).
 */
export async function RelatedProducts({
  categorySlug,
  categoryName,
  excludeSlug,
}: RelatedProductsProps) {
  const { items } = await getProducts({
    category: categorySlug,
    perPage: RELATED_COUNT + 1,
    sort: "featured",
  });
  const related = items
    .filter((product) => product.slug !== excludeSlug)
    .slice(0, RELATED_COUNT);

  if (related.length === 0) return null;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-subhead text-primary font-heading tracking-tight">
          {productDetailPage.relatedTitle}
        </h2>
        <Link
          href={`/category/${categorySlug}`}
          className="text-caption text-primary font-emphasis"
        >
          {productDetailPage.relatedViewAllCta(categoryName)}
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {related.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            imageSizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ))}
      </div>
    </section>
  );
}
