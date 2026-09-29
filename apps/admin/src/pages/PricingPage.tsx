import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tag } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { Pagination } from "@/components/ui/Pagination";
import { BulkPriceEditModal } from "@/pages/pricing/BulkPriceEditModal";
import { PriceHistoryModal } from "@/pages/pricing/PriceHistoryModal";
import { listProductPrices, listCategories } from "@/lib/api";
import { useQueryFilters } from "@/lib/useQueryFilters";
import { formatPrice } from "@/lib/formatters";
import type { ProductPriceRow } from "@/types/pricing";

const PAGE_SIZE = 20;

export default function PricingPage() {
  const [filters, setFilters] = useQueryFilters({ page: "1", category: "" });
  const page = Number(filters.page) || 1;
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<ProductPriceRow | null>(
    null,
  );

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories({ pageSize: 100 }),
  });

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["product-prices", filters],
    queryFn: () =>
      listProductPrices({
        page,
        pageSize: PAGE_SIZE,
        category: filters.category || undefined,
      }),
  });

  const rows = useMemo(() => data?.results ?? [], [data]);
  const pageIds = useMemo(() => rows.map((r) => Number(r.id)), [rows]);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  function toggleRow(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="اصلاح قیمت"
        description="انتخاب چندتایی محصولات، اعمال درصدی/مبلغی/ثابت با پیش‌نمایش اجباری قبل از ذخیره."
      />

      <section className="glass-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-6 py-4">
          <Select
            className="w-auto"
            value={filters.category}
            onChange={(e) =>
              setFilters({ category: e.target.value, page: "1" })
            }
          >
            <option value="">همه دسته‌بندی‌ها</option>
            {(categories?.results ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          {selected.size > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-300">
                {selected.size.toLocaleString("fa-IR")} محصول انتخاب شده
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelected(new Set())}
              >
                لغو انتخاب
              </Button>
              <Button size="sm" onClick={() => setBulkEditOpen(true)}>
                ویرایش قیمت گروهی
              </Button>
            </div>
          )}
        </div>

        {isError ? (
          <ErrorState
            description="دریافت قیمت‌ها ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && rows.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="محصولی یافت نشد"
            description="با فیلترهای فعلی محصولی پیدا نشد."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-start text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                    <th className="w-10 px-6 py-3">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={togglePage}
                        aria-label="انتخاب همه محصولات این صفحه"
                        className="size-4 rounded border-white/20 bg-ink-800 accent-brand-500"
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">محصول</th>
                    <th className="px-4 py-3 font-medium">قیمت فعلی</th>
                    <th className="px-4 py-3 font-medium">عملیات</th>
                  </tr>
                </thead>
                {isPending ? (
                  <TableSkeleton rows={8} cols={4} />
                ) : (
                  <tbody className="divide-y divide-white/[0.04]">
                    {rows.map((row) => {
                      const id = Number(row.id);
                      return (
                        <tr key={row.id}>
                          <td className="px-6 py-3">
                            <input
                              type="checkbox"
                              checked={selected.has(id)}
                              onChange={() => toggleRow(id)}
                              aria-label={`انتخاب ${row.name}`}
                              className="size-4 rounded border-white/20 bg-ink-800 accent-brand-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <p className="m-0 font-semibold text-white">
                              {row.name}
                            </p>
                            <p
                              className="m-0 text-[11px] text-slate-500"
                              dir="ltr"
                            >
                              {row.sku}
                            </p>
                          </td>
                          <td className="px-4 py-3 font-bold text-white">
                            {formatPrice(row.price)}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => setHistoryTarget(row)}
                              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-brand-500/30 hover:text-brand-300"
                            >
                              تاریخچه
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                )}
              </table>
            </div>
            {data && (
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                count={data.count}
                onPageChange={(p) => setFilters({ page: String(p) })}
              />
            )}
          </>
        )}
      </section>

      <BulkPriceEditModal
        open={bulkEditOpen}
        productIds={[...selected]}
        onClose={() => setBulkEditOpen(false)}
        onApplied={() => setSelected(new Set())}
      />
      <PriceHistoryModal
        product={historyTarget}
        onClose={() => setHistoryTarget(null)}
      />
    </div>
  );
}
