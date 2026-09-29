import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Chip } from "@/components/ui/Chip";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { Pagination } from "@/components/ui/Pagination";
import { CreateMovementModal } from "@/pages/inventory/CreateMovementModal";
import {
  listStockMovements,
  listProducts,
  downloadStockMovementsExport,
} from "@/lib/api";
import { useQueryFilters } from "@/lib/useQueryFilters";
import { formatJalaliDateTime } from "@/lib/formatters";
import {
  STOCK_MOVEMENT_TYPE_LABELS,
  type StockMovementType,
} from "@/types/inventory";
import { useToast } from "@/lib/ToastContext";

const PAGE_SIZE = 20;

export default function StockLedgerPage() {
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useQueryFilters({
    page: "1",
    product: "",
    type: "",
    dateFrom: "",
    dateTo: "",
  });
  const page = Number(filters.page) || 1;

  const { data: products } = useQuery({
    queryKey: ["products", "for-movement-picker"],
    queryFn: () => listProducts({ pageSize: 100 }),
  });
  const productsById = useMemo(
    () => new Map((products?.results ?? []).map((p) => [Number(p.id), p])),
    [products],
  );

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["stock-movements", filters],
    queryFn: () =>
      listStockMovements({
        page,
        pageSize: PAGE_SIZE,
        product: filters.product || undefined,
        type: filters.type || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      }),
  });

  const movements = data?.results ?? [];

  async function handleExport() {
    setExporting(true);
    try {
      await downloadStockMovementsExport({
        product: filters.product || undefined,
        type: filters.type || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      });
    } catch (error) {
      toast.showError(
        error instanceof Error ? error.message : "خروجی اکسل ناموفق بود.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="کاردکس"
        description="تاریخچه حرکت موجودی با مانده و فیلتر بازه."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? "در حال آماده‌سازی…" : "خروجی Excel"}
            </Button>
            <Button onClick={() => setFormOpen(true)}>+ ثبت حرکت دستی</Button>
          </>
        }
      />

      <section className="glass-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-6 py-4">
          <Select
            className="w-auto"
            value={filters.product}
            onChange={(e) => setFilters({ product: e.target.value, page: "1" })}
          >
            <option value="">همه محصولات</option>
            {(products?.results ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select
            className="w-auto"
            value={filters.type}
            onChange={(e) => setFilters({ type: e.target.value, page: "1" })}
          >
            <option value="">همه انواع</option>
            {Object.entries(STOCK_MOVEMENT_TYPE_LABELS).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </Select>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            از
            <Input
              type="date"
              className="w-auto"
              value={filters.dateFrom}
              onChange={(e) =>
                setFilters({ dateFrom: e.target.value, page: "1" })
              }
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            تا
            <Input
              type="date"
              className="w-auto"
              value={filters.dateTo}
              onChange={(e) =>
                setFilters({ dateTo: e.target.value, page: "1" })
              }
            />
          </label>
        </div>

        {isError ? (
          <ErrorState
            description="دریافت کاردکس ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && movements.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="حرکتی یافت نشد"
            description="با فیلترهای فعلی حرکتی ثبت نشده."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-start text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                    <th className="px-6 py-3 font-medium">تاریخ</th>
                    <th className="px-4 py-3 font-medium">محصول</th>
                    <th className="px-4 py-3 font-medium">نوع</th>
                    <th className="px-4 py-3 font-medium">تعداد</th>
                    <th className="px-4 py-3 font-medium">مانده بعد</th>
                    <th className="px-4 py-3 font-medium">مرجع / یادداشت</th>
                  </tr>
                </thead>
                {isPending ? (
                  <TableSkeleton rows={8} cols={6} />
                ) : (
                  <tbody className="divide-y divide-white/[0.04]">
                    {movements.map((movement) => (
                      <tr key={movement.id}>
                        <td className="px-6 py-3 text-slate-400">
                          {formatJalaliDateTime(movement.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-white">
                          {productsById.get(movement.product)?.name ??
                            `#${movement.product}`}
                        </td>
                        <td className="px-4 py-3">
                          <Chip
                            tone={movement.quantity >= 0 ? "success" : "danger"}
                          >
                            {
                              STOCK_MOVEMENT_TYPE_LABELS[
                                movement.type as StockMovementType
                              ]
                            }
                          </Chip>
                        </td>
                        <td
                          className={
                            movement.quantity >= 0
                              ? "px-4 py-3 font-bold text-success"
                              : "px-4 py-3 font-bold text-danger"
                          }
                        >
                          {movement.quantity >= 0 ? "+" : ""}
                          {movement.quantity.toLocaleString("fa-IR")}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {movement.balanceAfter.toLocaleString("fa-IR")}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {movement.reference || "—"}
                          {movement.note && ` · ${movement.note}`}
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

      <CreateMovementModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
