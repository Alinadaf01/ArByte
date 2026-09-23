import { ProductCardSkeleton } from "@/components/product/ProductCardSkeleton";

/** T-202 §۴ — اسکلت گرید محصول، داخل Suspense تودرتوی صفحه‌ی دسته‌بندی. */
export function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
