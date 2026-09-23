import Link from "next/link";
import { toPersianDigits } from "@arbyte/contracts";
import { categoryDetailPage } from "@arbyte/contracts";

interface ProductPaginationProps {
  page: number;
  totalPages: number;
  /** مسیر پایه + سایر پارامترها (مثل sort) — فقط page عوض می‌شود. */
  buildHref: (page: number) => string;
}

/**
 * T-202 §۲.۴ — عمداً `packages/ui`'s `Pagination` (دکمه‌ی onClick) استفاده
 * نشده: بند صریح سند تسک لینک واقعی `<a href>` با `rel="prev"/"next"`
 * می‌خواهد تا موتور جستجو بتواند دنبالش کند — یک دکمه‌ی جاوااسکریپتی این
 * را نمی‌دهد.
 */
export function ProductPagination({
  page,
  totalPages,
  buildHref,
}: ProductPaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav
      aria-label="صفحه‌بندی"
      dir="rtl"
      className="flex items-center justify-center gap-1"
    >
      {page > 1 ? (
        <Link
          href={buildHref(page - 1)}
          rel="prev"
          aria-label={categoryDetailPage.paginationPrevious}
          className="text-secondary hover:bg-surface-muted flex h-9 items-center rounded-tile-sm px-3 text-caption"
        >
          {categoryDetailPage.paginationPrevious}
        </Link>
      ) : null}

      {pages.map((p) => (
        <Link
          key={p}
          href={buildHref(p)}
          aria-current={p === page ? "page" : undefined}
          className={`flex h-9 min-w-9 items-center justify-center rounded-tile-sm px-2 text-caption ${
            p === page
              ? "bg-brand text-on-dark"
              : "text-secondary hover:bg-surface-muted"
          }`}
        >
          {toPersianDigits(p)}
        </Link>
      ))}

      {page < totalPages ? (
        <Link
          href={buildHref(page + 1)}
          rel="next"
          aria-label={categoryDetailPage.paginationNext}
          className="text-secondary hover:bg-surface-muted flex h-9 items-center rounded-tile-sm px-3 text-caption"
        >
          {categoryDetailPage.paginationNext}
        </Link>
      ) : null}
    </nav>
  );
}
