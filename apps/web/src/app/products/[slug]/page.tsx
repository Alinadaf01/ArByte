import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@arbyte/ui";
import { productDetailPage, productsPage, storeFacts } from "@arbyte/contracts";
import type { Availability } from "@arbyte/contracts";
import { StorefrontShell } from "@/components/shell/StorefrontShell";
import { ProductGallery } from "@/components/product/ProductGallery";
import { PurchasePanel } from "@/components/product/PurchasePanel";
import { TrustTiles } from "@/components/product/TrustTiles";
import { ProductInfoTabs } from "@/components/product/ProductInfoTabs";
import { ProductReviews } from "@/components/product/ProductReviews";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import { resolveInitialVariant } from "@/components/product/resolve-variant";
import { getProductBySlug } from "@/lib/catalog";
import { SITE_OPEN_GRAPH } from "@/lib/seo";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ v?: string }>;
}

const SCHEMA_AVAILABILITY: Record<Availability["status"], string> = {
  IN_STOCK: "https://schema.org/InStock",
  LOW_STOCK: "https://schema.org/LimitedAvailability",
  OUT_OF_STOCK: "https://schema.org/OutOfStock",
  PREORDER: "https://schema.org/PreOrder",
};

/**
 * ⚠️ T-214 §۳ — lookup محصول قبل از هر Suspense/بازگشت زودهنگام، تا slug
 * نامعتبر واقعاً ۴۰۴ بدهد نه ۲۰۰ با محتوای خالی.
 */
export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const title = product.seo.title || `${product.name} | آربایت`;
  // G-02 — بدون متن سئو/توضیح کوتاه هم description یکتا داشته باشد.
  const description =
    product.seo.description ||
    product.shortDescription ||
    `خرید ${product.name} (${product.brand.name}) از آربایت؛ تست‌شده پیش از ارسال، با قیمت و مشخصات کامل.`;
  const url = `/products/${slug}`;
  const image = product.images[0];
  return {
    title,
    description,
    // بند ۳ سند تسک — canonical همیشه بدون `?v=`.
    alternates: { canonical: product.seo.canonical ?? url },
    openGraph: {
      ...SITE_OPEN_GRAPH,
      title,
      description,
      url,
      images: image
        ? [{ url: image.url, alt: image.alt ?? product.name }]
        : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
    },
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: ProductPageProps) {
  const { slug } = await params;
  const { v: requestedVariantId } = await searchParams;

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const selectedVariant = resolveInitialVariant(
    product.variants,
    product.defaultVariantId,
    requestedVariantId,
  );
  const qualifiesForFreeShipping =
    selectedVariant.price.final >= storeFacts.policies.freeShippingMinToman;
  // AUDIT §۱۲.۴ — مشخصات کلیدی از بک‌اند، برای همان پیکربندی انتخاب‌شده.
  const keySpecChips = selectedVariant.keySpecs ?? [];

  const breadcrumbItems = [
    { label: productsPage.breadcrumbHome, href: "/" },
    { label: productsPage.breadcrumbShop, href: "/products" },
    {
      label: product.category.name,
      href: `/category/${product.category.slug}`,
    },
    { label: product.name },
  ];

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: item.href } : {}),
    })),
  };

  // کش ISR قدیمی (پیش از G-01) ممکن است rating نداشته باشد.
  const rating = product.rating ?? { average: null, count: 0 };
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.map((image) => image.url),
    description: product.shortDescription ?? product.description ?? undefined,
    brand: { "@type": "Brand", name: product.brand.name },
    sku: selectedVariant.sku,
    // G-01 — فقط با ≥۳ نظر تأییدشده (کمتر از آن سیگنال قابل‌اتکایی نیست).
    ...(rating.count >= 3 && rating.average != null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating.average,
            reviewCount: rating.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    offers: {
      "@type": "Offer",
      price: selectedVariant.price.final * 10,
      priceCurrency: "IRR",
      availability: SCHEMA_AVAILABILITY[selectedVariant.availability.status],
      url: `/products/${product.slug}`,
    },
  };

  return (
    <StorefrontShell headerActive="products" navActive="">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

      <div className="flex flex-col gap-7 px-[5vw] py-6 md:gap-8 md:py-9">
        <Breadcrumb items={breadcrumbItems} />

        <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-2 lg:gap-11">
          <ProductGallery productName={product.name} images={product.images} />

          <div className="flex min-w-0 flex-col gap-4.5">
            <div>
              <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
                <span
                  dir="ltr"
                  className="text-caption text-brand-active font-emphasis"
                >
                  {product.brand.name}
                </span>
                <span className="bg-border h-0.75 w-0.75 rounded-full" />
                <span className="text-caption text-secondary">
                  {product.category.name}
                </span>
                {product.grade ? (
                  <span className="bg-brand-tint-1 text-brand-active rounded-pill px-2.5 py-1 text-caption font-emphasis">
                    {productDetailPage.gradeLabel(product.grade)}
                  </span>
                ) : null}
                {product.isPresale ? (
                  <span className="bg-accent text-accent-badge-ink rounded-pill px-2.5 py-1 text-caption font-emphasis">
                    {productDetailPage.presaleLabel}
                  </span>
                ) : null}
              </div>
              <h1 className="text-hero text-primary font-heading tracking-tight">
                {product.name}
              </h1>
              {product.shortDescription ? (
                <p className="text-body text-secondary mt-2.5 max-w-[52ch]">
                  {product.shortDescription}
                </p>
              ) : null}
            </div>

            {keySpecChips.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {keySpecChips.map((item) => (
                  <span
                    key={item.name}
                    className="border-border bg-surface text-secondary-2 rounded-tile-sm border px-3 py-1.5 text-caption font-emphasis"
                  >
                    {item.value}
                  </span>
                ))}
              </div>
            ) : null}

            <PurchasePanel
              productSlug={product.slug}
              variants={product.variants}
              selectedVariantId={selectedVariant.id}
            />

            <TrustTiles selectedVariantPrice={selectedVariant.price.final} />
          </div>
        </div>

        <ProductInfoTabs
          specifications={product.specifications}
          description={product.description}
          qualifiesForFreeShipping={qualifiesForFreeShipping}
          isPresale={product.isPresale}
          shippingNote={product.shippingNote}
          returnPolicyNote={product.returnPolicyNote}
        />

        <ProductReviews productSlug={product.slug} />

        <RelatedProducts
          categorySlug={product.category.slug}
          categoryName={product.category.name}
          excludeSlug={product.slug}
        />
      </div>
    </StorefrontShell>
  );
}
