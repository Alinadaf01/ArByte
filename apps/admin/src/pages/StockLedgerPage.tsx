import { useQuery } from "@tanstack/react-query";
import { JalaliDateInput } from "@/components/ui/JalaliDateInput";
import { FileSpreadsheet, FileText, ScrollText } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Input, Select } from "@/components/ui/Field";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { exportLedger, listTransactions } from "@/lib/catalogApi";
import { formatJalaliDateTime } from "@/lib/formatters";
import { useQueryFilters } from "@/lib/useQueryFilters";
import { useToast } from "@/lib/ToastContext";
import { TRANSACTION_LABELS, type TransactionType } from "@/types/catalog";

const PAGE_SIZE = 12;

export default function StockLedgerPage() {
  const toast = useToast();
  const [filters, setFilters] = useQueryFilters({
    page: "1",
    search: "",
    type: "",
    dateFrom: "",
    dateTo: "",
  });
  const page = Number(filters.page) || 1;
  const params = {
    search: filters.search || undefined,
    type: filters.type || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  };
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["ledger", filters],
    queryFn: () => listTransactions({ page, ...params }),
  });
  const rows = data?.results ?? [];
  const exportAs = (format: "xlsx" | "pdf") =>
    exportLedger(params, format).catch((e: Error) =>
      toast.showError(e.message),
    );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="کاردکس"
        description="همه‌ی گردش‌های موجودی هر واریانت: ورود، خروج، اصلاح، رزرو و آزادسازی."
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportAs("xlsx")}
            >
              <FileSpreadsheet className="size-4" /> Excel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportAs("pdf")}
            >
              <FileText className="size-4" /> PDF
            </Button>
          </>
        }
      />
      <section className="glass-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-6 py-4">
          <Input
            className="w-56"
            placeholder="SKU، محصول یا مرجع…"
            defaultValue={filters.search}
            onBlur={(e) => setFilters({ search: e.target.value, page: "1" })}
          />
          <Select
            className="w-auto"
            value={filters.type}
            onChange={(e) => setFilters({ type: e.target.value, page: "1" })}
          >
            <option value="">همه‌ی انواع</option>
            {Object.entries(TRANSACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            از
            <JalaliDateInput
              label="از تاریخ"
              value={filters.dateFrom}
              onChange={(iso) => setFilters({ dateFrom: iso, page: "1" })}
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            تا
            <JalaliDateInput
              label="تا تاریخ"
              value={filters.dateTo}
              onChange={(iso) => setFilters({ dateTo: iso, page: "1" })}
            />
          </label>
        </div>
        {isError ? (
          <ErrorState
            description="دریافت کاردکس ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && rows.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="گردشی یافت نشد"
            description="با فیلترهای فعلی تراکنشی نیست."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-start text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                    <th className="px-6 py-3 font-medium">زمان</th>
                    <th className="px-4 py-3 font-medium">واریانت</th>
                    <th className="px-4 py-3 font-medium">نوع</th>
                    <th className="px-4 py-3 font-medium">تغییر</th>
                    <th className="px-4 py-3 font-medium">قبل ← بعد</th>
                    <th className="px-4 py-3 font-medium">مرجع / دلیل</th>
                  </tr>
                </thead>
                {isPending ? (
                  <TableSkeleton rows={6} cols={6} />
                ) : (
                  <tbody className="divide-y divide-white/[0.04]">
                    {rows.map((t) => (
                      <tr key={t.id}>
                        <td className="px-6 py-3 text-slate-400">
                          {formatJalaliDateTime(t.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="m-0 text-white">{t.productName}</p>
                          <p
                            className="m-0 font-mono text-[11px] text-slate-500"
                            dir="ltr"
                          >
                            {t.sku}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <Chip
                            tone={t.quantityChange >= 0 ? "success" : "danger"}
                          >
                            {TRANSACTION_LABELS[t.type as TransactionType]}
                          </Chip>
                        </td>
                        <td
                          className="px-4 py-3 font-bold text-white"
                          dir="ltr"
                        >
                          {t.quantityChange > 0
                            ? `+${t.quantityChange}`
                            : t.quantityChange}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {t.quantityBefore.toLocaleString("fa-IR")} ←{" "}
                          {t.quantityAfter.toLocaleString("fa-IR")}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {t.reference && <span dir="ltr">{t.reference} </span>}
                          {t.note}
                          {t.userName && (
                            <span className="text-slate-600">
                              {" "}
                              · {t.userName}
                            </span>
                          )}
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
    </div>
  );
}
