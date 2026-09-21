"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  LayoutList,
  Rows3,
} from "lucide-react";
import { toPersianDigits } from "@arbyte/contracts";
import { dictionary } from "@/lib/dictionary";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  align?: "start" | "end";
}

export interface DataTableFilter<T> {
  key: string;
  label: string;
  predicate: (row: T) => boolean;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  searchTerm?: string;
  searchPredicate?: (row: T, term: string) => boolean;
  filters?: DataTableFilter<T>[];
  rowActions?: (row: T) => ReactNode;
  loading?: boolean;
  pageSize?: number;
  selectable?: boolean;
}

type SortDirection = "asc" | "desc";

const DENSITY_ROW_PADDING: Record<"comfortable" | "compact", string> = {
  comfortable: "py-4",
  compact: "py-3",
};

/**
 * جدول قابل استفاده‌ی مجدد — طبق T-100: فیلتر (تب)، مرتب‌سازی، صفحه‌بندی،
 * انتخاب چندتایی، حالت خالی، اسکلت بارگذاری، کلید تراکم. هر صفحه‌ی ادمین
 * آینده (سفارش‌ها، کاربران، ...) این کامپوننت را با `columns`/`rows` خودش
 * صدا می‌زند — منطق مشترک اینجا یک‌بار نوشته شده.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  searchTerm = "",
  searchPredicate,
  filters,
  rowActions,
  loading = false,
  pageSize = 5,
  selectable = true,
}: DataTableProps<T>) {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [density, setDensity] = useState<"comfortable" | "compact">(
    "comfortable",
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let next = rows;
    const filter = filters?.find((f) => f.key === activeFilter);
    if (filter) next = next.filter(filter.predicate);
    if (searchTerm && searchPredicate) {
      next = next.filter((row) =>
        searchPredicate(row, searchTerm.trim().toLowerCase()),
      );
    }
    return next;
  }, [rows, filters, activeFilter, searchTerm, searchPredicate]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const column = columns.find((c) => c.key === sortKey);
    if (!column?.sortValue) return filtered;
    const withValues = filtered.map((row) => ({
      row,
      value: column.sortValue!(row),
    }));
    withValues.sort((a, b) => {
      if (a.value < b.value) return sortDir === "asc" ? -1 : 1;
      if (a.value > b.value) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return withValues.map((x) => x.row);
  }, [filtered, sortKey, sortDir, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const paginated = sorted.slice(
    currentPage * pageSize,
    currentPage * pageSize + pageSize,
  );

  const toggleSort = (column: DataTableColumn<T>) => {
    if (!column.sortValue) return;
    if (sortKey !== column.key) {
      setSortKey(column.key);
      setSortDir("asc");
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  };

  const pageIds = paginated.map(getRowId);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelectRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {filters ? (
            <div
              className="bg-surface-muted flex gap-1 rounded-tile p-1"
              role="tablist"
            >
              {filters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={activeFilter === f.key}
                  onClick={() => {
                    setActiveFilter(f.key);
                    setPage(0);
                  }}
                  className={[
                    "rounded-chip px-3 py-1.5 text-micro font-medium transition-colors duration-200",
                    activeFilter === f.key
                      ? "bg-surface text-brand shadow-card font-emphasis"
                      : "text-secondary hover:text-primary",
                  ].join(" ")}
                >
                  {f.label}
                </button>
              ))}
            </div>
          ) : null}
          {selected.size > 0 ? (
            <span className="text-caption text-micro">
              {toPersianDigits(selected.size)}{" "}
              {dictionary.table.selectedCountSuffix}
            </span>
          ) : null}
        </div>

        <div
          role="group"
          aria-label={dictionary.table.density.label}
          className="border-border inline-flex items-center gap-1 self-start rounded-tile border p-1"
        >
          <button
            type="button"
            aria-pressed={density === "comfortable"}
            onClick={() => setDensity("comfortable")}
            className={[
              "flex items-center gap-1.5 rounded-chip px-2.5 py-1 text-micro font-medium transition-colors duration-200",
              // text-brand روی bg-brand-tint-1 فقط ۴.۲۶:۱ است — text-brand-active (۶.۹۳:۱) لازم است
              density === "comfortable"
                ? "bg-brand-tint-1 text-brand-active font-emphasis"
                : "text-secondary",
            ].join(" ")}
          >
            <Rows3 size={14} aria-hidden="true" />
            {dictionary.table.density.comfortable}
          </button>
          <button
            type="button"
            aria-pressed={density === "compact"}
            onClick={() => setDensity("compact")}
            className={[
              "flex items-center gap-1.5 rounded-chip px-2.5 py-1 text-micro font-medium transition-colors duration-200",
              density === "compact"
                ? "bg-brand-tint-1 text-brand-active font-emphasis"
                : "text-secondary",
            ].join(" ")}
          >
            <LayoutList size={14} aria-hidden="true" />
            {dictionary.table.density.compact}
          </button>
        </div>
      </div>

      <div className="border-border overflow-x-auto rounded-panel border">
        <table className="w-full text-start text-body">
          <thead>
            <tr className="border-border border-b">
              {selectable ? (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={dictionary.table.selectAllLabel}
                    checked={allPageSelected}
                    onChange={toggleSelectAll}
                    className="accent-brand h-4 w-4"
                  />
                </th>
              ) : null}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-micro font-emphasis text-caption"
                >
                  {column.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column)}
                      className="hover:text-primary inline-flex items-center gap-1"
                    >
                      {column.header}
                      {sortKey === column.key ? (
                        sortDir === "asc" ? (
                          <ChevronUp size={14} aria-hidden="true" />
                        ) : (
                          <ChevronDown size={14} aria-hidden="true" />
                        )
                      ) : null}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
              {rowActions ? (
                <th className="px-4 py-3 text-micro font-emphasis text-caption">
                  {dictionary.table.columns.actions}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: pageSize }).map((_, i) => (
                  <tr key={i} className="border-border border-b last:border-0">
                    {selectable ? (
                      <td className={`px-4 ${DENSITY_ROW_PADDING[density]}`}>
                        <div className="bg-surface-muted h-4 w-4 animate-pulse rounded" />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-4 ${DENSITY_ROW_PADDING[density]}`}
                      >
                        <div className="bg-surface-muted h-4 w-24 animate-pulse rounded" />
                      </td>
                    ))}
                    {rowActions ? (
                      <td className={`px-4 ${DENSITY_ROW_PADDING[density]}`}>
                        <div className="bg-surface-muted h-4 w-10 animate-pulse rounded" />
                      </td>
                    ) : null}
                  </tr>
                ))
              : paginated.map((row) => {
                  const id = getRowId(row);
                  return (
                    <tr
                      key={id}
                      className="border-border hover:bg-brand-tint-1/40 border-b transition-colors duration-200 last:border-0"
                    >
                      {selectable ? (
                        <td className={`px-4 ${DENSITY_ROW_PADDING[density]}`}>
                          <input
                            type="checkbox"
                            aria-label={dictionary.table.selectRowLabel}
                            checked={selected.has(id)}
                            onChange={() => toggleSelectRow(id)}
                            className="accent-brand h-4 w-4"
                          />
                        </td>
                      ) : null}
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={`px-4 ${DENSITY_ROW_PADDING[density]} ${column.align === "end" ? "text-end" : "text-start"}`}
                        >
                          {column.render(row)}
                        </td>
                      ))}
                      {rowActions ? (
                        <td className={`px-4 ${DENSITY_ROW_PADDING[density]}`}>
                          {rowActions(row)}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
          </tbody>
        </table>

        {!loading && sorted.length === 0 ? (
          <p className="text-caption py-10 text-center text-body">
            {dictionary.table.empty}
          </p>
        ) : null}
      </div>

      {!loading && sorted.length > 0 ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-caption text-micro">
            {dictionary.table.pagination.pageWord}{" "}
            {toPersianDigits(currentPage + 1)}{" "}
            {dictionary.table.pagination.ofWord} {toPersianDigits(pageCount)}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              aria-label={dictionary.table.pagination.prevLabel}
              className="border-border text-secondary flex h-9 w-9 items-center justify-center rounded-tile border disabled:opacity-40"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={currentPage >= pageCount - 1}
              aria-label={dictionary.table.pagination.nextLabel}
              className="border-border text-secondary flex h-9 w-9 items-center justify-center rounded-tile border disabled:opacity-40"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
