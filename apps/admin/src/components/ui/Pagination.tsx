import { cn } from "@/lib/cn";

export interface PaginationProps {
  page: number;
  pageSize: number;
  count: number;
  onPageChange: (page: number) => void;
}

function pageNumbers(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([
    1,
    2,
    total - 1,
    total,
    current - 1,
    current,
    current + 1,
  ]);
  const sorted = [...pages]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push("gap");
    result.push(p);
    prev = p;
  }
  return result;
}

export function Pagination({
  page,
  pageSize,
  count,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  if (totalPages <= 1 && count === 0) return null;

  const from = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(count, page * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.06] px-6 py-4">
      <p className="text-xs text-slate-500">
        نمایش {from.toLocaleString("fa-IR")} تا {to.toLocaleString("fa-IR")} از{" "}
        {count.toLocaleString("fa-IR")} مورد
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="icon-btn !h-8 !w-8 disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="صفحه قبل"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        </button>
        {pageNumbers(page, totalPages).map((p, i) =>
          p === "gap" ? (
            <span key={`gap-${i}`} className="px-2 text-xs text-slate-600">
              ...
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                "grid h-8 w-8 place-items-center rounded-lg text-xs font-semibold transition-colors",
                p === page
                  ? "bg-brand-500/15 font-bold text-brand-300"
                  : "text-slate-400 hover:bg-white/5",
              )}
            >
              {p.toLocaleString("fa-IR")}
            </button>
          ),
        )}
        <button
          type="button"
          className="icon-btn !h-8 !w-8 disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="صفحه بعد"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
