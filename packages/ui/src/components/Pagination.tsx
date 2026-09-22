import { toPersianDigits } from "@arbyte/contracts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/cn";

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  previousLabel: string;
  nextLabel: string;
  className?: string;
}

/**
 * بند ۷ الحاقیه — ترتیب اعداد از راست. چون `dir="rtl"` و آرایه‌ی صفحات به
 * ترتیب طبیعی (۱..N) رندر می‌شود، صفحه‌ی ۱ خودکار راست‌ترین می‌افتد — نیازی
 * به معکوس‌کردن آرایه نیست. دکمه‌ی «قبلی» (صفحه‌ی کوچک‌تر) سمت راست است،
 * پس آیکونش به راست اشاره می‌کند (`ChevronRight`)؛ «بعدی» برعکس.
 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  previousLabel,
  nextLabel,
  className,
}: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav
      aria-label="صفحه‌بندی"
      dir="rtl"
      className={cn("flex items-center gap-1", className)}
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label={previousLabel}
        className="text-secondary flex h-9 w-9 items-center justify-center rounded-tile-sm hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          aria-current={p === page ? "page" : undefined}
          onClick={() => onPageChange(p)}
          className={cn(
            "text-caption flex h-9 min-w-9 items-center justify-center rounded-tile-sm px-2",
            p === page
              ? "bg-brand text-on-dark"
              : "text-secondary hover:bg-surface-muted",
          )}
        >
          {toPersianDigits(p)}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label={nextLabel}
        className="text-secondary flex h-9 w-9 items-center justify-center rounded-tile-sm hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}
