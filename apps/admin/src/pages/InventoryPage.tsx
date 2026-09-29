import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Warehouse } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Field";
import { Chip } from "@/components/ui/Chip";
import { TableSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { Pagination } from "@/components/ui/Pagination";
import { StockAlertFormModal } from "@/pages/inventory/StockAlertFormModal";
import { listInventory, getInventorySummary, listCategories } from "@/lib/api";
import { useQueryFilters } from "@/lib/useQueryFilters";
import { formatPrice } from "@/lib/formatters";
import type { InventoryRow } from "@/types/inventory";

const PAGE_SIZE = 12;

export default function InventoryPage() {
  const [alertTarget, setAlertTarget] = useState<InventoryRow | null>(null);
  const [filters, setFilters] = useQueryFilters({
    page: "1",
    category: "",
    isLow: "",
  });
  const page = Number(filters.page) || 1;

  const { data: summary, isPending: summaryPending } = useQuery({
    queryKey: ["inventory-summary"],
    queryFn: getInventorySummary,
  });
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories({ pageSize: 100 }),
  });

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["inventory", filters],
    queryFn: () =>
      listInventory({
        page,
        pageSize: PAGE_SIZE,
        category: filters.category || undefined,
        isLow: filters.isLow || undefined,
      }),
  });

  const rows = data?.results ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="موجودی"
        description="وضعیت فعلی موجودی با نقطه سفارش و هشدار."
      />

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="glass-card p-6">
          <p className="m-0 text-sm text-slate-400">ارزش کل موجودی</p>
          {summaryPending ? (
            <Skeleton className="mt-2 h-8 w-32" />
          ) : (
            <p className="mt-1 text-2xl font-extrabold text-white">
              {summary?.totalStockValue !== null &&
              summary?.totalStockValue !== undefined
                ? formatPrice(summary.totalStockValue)
                : "نامشخص"}
            </p>
          )}
        </div>
        <div className="glass-card p-6">
          <p className="m-0 text-sm text-slate-400">تعداد محصولات کم‌موجودی</p>
          {summaryPending ? (
            <Skeleton className="mt-2 h-8 w-16" />
          ) : (
            <p className="mt-1 text-2xl font-extrabold text-warning">
              {(summary?.lowStockCount ?? 0).toLocaleString("fa-IR")}
            </p>
          )}
        </div>
      </section>

      <section className="glass-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-6 py-4">
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
          <Select
            className="w-auto"
            value={filters.isLow}
            onChange={(e) => setFilters({ isLow: e.target.value, page: "1" })}
          >
            <option value="">همه محصولات</option>
            <option value="true">فقط کم‌موجودی</option>
          </Select>
        </div>

        {isError ? (
          <ErrorState
            description="دریافت موجودی ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && rows.length === 0 ? (
          <EmptyState
            icon={Warehouse}
            title="محصولی یافت نشد"
            description="با فیلترهای فعلی محصولی پیدا نشد."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-start text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                    <th className="px-6 py-3 font-medium">محصول</th>
                    <th className="px-4 py-3 font-medium">موجودی</th>
                    <th className="px-4 py-3 font-medium">نقطه سفارش</th>
                    <th className="px-4 py-3 font-medium">ارزش موجودی</th>
                    <th className="px-4 py-3 font-medium">وضعیت</th>
                    <th className="px-4 py-3 font-medium">عملیات</th>
                  </tr>
                </thead>
                {isPending ? (
                  <TableSkeleton rows={6} cols={6} />
                ) : (
                  <tbody className="divide-y divide-white/[0.04]">
                    {rows.map((row) => (
                      <tr key={row.product.id}>
                        <td className="px-6 py-3">
                          <p className="m-0 font-semibold text-white">
                            {row.product.name}
                          </p>
                          <p
                            className="m-0 text-[11px] text-slate-500"
                            dir="ltr"
                          >
                            {row.product.sku}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              row.stockCount === 0
                                ? "font-bold text-danger"
                                : "font-bold text-white"
                            }
                          >
                            {row.stockCount.toLocaleString("fa-IR")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {row.reorderPoint ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {row.stockValue !== null
                            ? formatPrice(row.stockValue)
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Chip tone={row.isLow ? "warning" : "success"} dot>
                            {row.isLow ? "کم" : "موجود"}
                          </Chip>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setAlertTarget(row)}
                            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-brand-500/30 hover:text-brand-300"
                          >
                            ویرایش هشدار
                          </button>
                        </td>
                      </tr>
                    ))}
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

      <StockAlertFormModal
        row={alertTarget}
        onClose={() => setAlertTarget(null)}
      />
    </div>
  );
}
