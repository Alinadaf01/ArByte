import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, History, Tags } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Field";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import {
  applyPrices,
  downloadPriceList,
  getPriceHistory,
  listPrices,
  previewPrices,
  type BulkPriceBody,
} from "@/lib/catalogApi";
import { formatJalaliDateTime, formatPrice } from "@/lib/formatters";
import { useQueryFilters } from "@/lib/useQueryFilters";
import { useToast } from "@/lib/ToastContext";
import type { PriceChange, PriceRow } from "@/types/catalog";

const PAGE_SIZE = 50;

function HistoryModal({
  row,
  onClose,
}: {
  row: PriceRow;
  onClose: () => void;
}) {
  const { data = [], isPending } = useQuery({
    queryKey: ["price-history", row.id],
    queryFn: () => getPriceHistory(row.id),
  });
  return (
    <Modal open onClose={onClose} title={`تاریخچه‌ی قیمت ${row.sku}`}>
      {isPending ? (
        <p className="text-xs text-slate-500">در حال دریافت…</p>
      ) : data.length === 0 ? (
        <p className="text-xs text-slate-500">تغییری ثبت نشده است.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
          {data.map((h, i) => (
            <li
              key={i}
              className="rounded-lg border border-white/[0.06] px-3 py-2"
            >
              <p className="m-0 text-white">
                {formatPrice(h.previousPrice)} ← {formatPrice(h.newPrice)}
              </p>
              <p className="m-0 text-[11px] text-slate-500">
                {formatJalaliDateTime(h.createdAt)} · {h.changedBy ?? "سیستم"} ·{" "}
                {h.reason}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

export default function PricingPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useQueryFilters({ page: "1", search: "" });
  const page = Number(filters.page) || 1;
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"percent" | "amount">("percent");
  const [value, setValue] = useState(0);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<{
    body: BulkPriceBody;
    changes: PriceChange[];
  } | null>(null);
  const [historyRow, setHistoryRow] = useState<PriceRow | null>(null);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["prices", filters],
    queryFn: () => listPrices({ page, search: filters.search || undefined }),
  });
  const rows = data?.results ?? [];
  const onError = (error: unknown) =>
    toast.showError(
      error instanceof Error ? error.message : "عملیات ناموفق بود.",
    );

  const previewMutation = useMutation({
    mutationFn: (body: BulkPriceBody) =>
      previewPrices(body).then((r) => ({ body, changes: r.changes })),
    onSuccess: (result) =>
      result.changes.length
        ? setPreview(result)
        : toast.showError("قیمتی عوض نمی‌شود."),
    onError,
  });
  const applyMutation = useMutation({
    mutationFn: (body: BulkPriceBody) => applyPrices(body),
    onSuccess: (result) => {
      toast.showSuccess(
        `${result.count.toLocaleString("fa-IR")} قیمت به‌روز شد.`,
      );
      setPreview(null);
      setEdits({});
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["prices"] });
    },
    onError,
  });

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="اصلاح قیمت"
        description="ویرایش جدولی یا تغییر گروهی درصدی/مبلغی؛ هر تغییر اول پیش‌نمایش می‌شود و بعد اعمال."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              downloadPriceList({ search: filters.search || undefined }).catch(
                onError,
              )
            }
          >
            <FileText className="size-4" /> لیست قیمت PDF
          </Button>
        }
      />

      <section className="glass-card flex flex-wrap items-end gap-3 p-5">
        <Field label="تغییر گروهی روی ردیف‌های انتخاب‌شده" htmlFor="bulk-mode">
          <Select
            id="bulk-mode"
            className="w-auto"
            value={mode}
            onChange={(e) => setMode(e.target.value as "percent" | "amount")}
          >
            <option value="percent">درصد</option>
            <option value="amount">مبلغ (تومان)</option>
          </Select>
        </Field>
        <Field
          label={
            mode === "percent" ? "درصد (منفی = کاهش)" : "مبلغ (منفی = کاهش)"
          }
          htmlFor="bulk-value"
        >
          <Input
            id="bulk-value"
            type="number"
            className="w-36"
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
          />
        </Field>
        <Field label="دلیل" htmlFor="bulk-reason">
          <Input
            id="bulk-reason"
            className="w-48"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <Button
          size="sm"
          disabled={
            selected.size === 0 || value === 0 || previewMutation.isPending
          }
          onClick={() =>
            previewMutation.mutate({
              mode,
              value,
              variantIds: Array.from(selected),
              reason,
            })
          }
        >
          پیش‌نمایش ({selected.size.toLocaleString("fa-IR")})
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={
            Object.keys(edits).length === 0 || previewMutation.isPending
          }
          onClick={() =>
            previewMutation.mutate({
              changes: Object.entries(edits).map(([variant, newPrice]) => ({
                variant,
                newPrice,
              })),
              reason,
            })
          }
        >
          پیش‌نمایش ویرایش‌های جدول (
          {Object.keys(edits).length.toLocaleString("fa-IR")})
        </Button>
        <p className="m-0 w-full text-[11px] text-slate-500">
          قیمت‌های گروهی به ۱۰۰۰ تومان بالا گرد می‌شوند.
        </p>
      </section>

      <section className="glass-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-6 py-4">
          <Input
            className="w-56"
            placeholder="نام محصول یا SKU…"
            defaultValue={filters.search}
            onBlur={(e) => setFilters({ search: e.target.value, page: "1" })}
          />
        </div>
        {isError ? (
          <ErrorState
            description="دریافت قیمت‌ها ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && rows.length === 0 ? (
          <EmptyState
            icon={Tags}
            title="واریانتی یافت نشد"
            description="جستجو را تغییر دهید."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-start text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="انتخاب همه"
                        checked={
                          rows.length > 0 &&
                          rows.every((r) => selected.has(r.id))
                        }
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? new Set(rows.map((r) => r.id))
                              : new Set(),
                          )
                        }
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">واریانت</th>
                    <th className="px-4 py-3 font-medium">قیمت فعلی</th>
                    <th className="px-4 py-3 font-medium">قیمت جدید</th>
                    <th className="px-4 py-3 font-medium">تاریخچه</th>
                  </tr>
                </thead>
                {isPending ? (
                  <TableSkeleton rows={8} cols={5} />
                ) : (
                  <tbody className="divide-y divide-white/[0.04]">
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            aria-label={`انتخاب ${r.sku}`}
                            checked={selected.has(r.id)}
                            onChange={() => toggle(r.id)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <p className="m-0 text-white">{r.productName}</p>
                          <p className="m-0 text-[11px] text-slate-500">
                            <span dir="ltr" className="font-mono">
                              {r.sku}
                            </span>
                            {r.name ? ` · ${r.name}` : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {formatPrice(r.finalPrice)}
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min={0}
                            className="w-36"
                            aria-label={`قیمت جدید ${r.sku}`}
                            value={edits[r.id] ?? ""}
                            placeholder={String(r.finalPrice)}
                            onChange={(e) =>
                              setEdits((all) => {
                                const next = { ...all };
                                if (
                                  e.target.value === "" ||
                                  Number(e.target.value) === r.finalPrice
                                )
                                  delete next[r.id];
                                else next[r.id] = Number(e.target.value);
                                return next;
                              })
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label={`تاریخچه‌ی ${r.sku}`}
                            onClick={() => setHistoryRow(r)}
                          >
                            <History className="size-4" />
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

      <Modal
        open={preview !== null}
        onClose={() => setPreview(null)}
        title="پیش‌نمایش تغییر قیمت"
        widthClass="max-w-2xl"
      >
        {preview && (
          <div className="flex flex-col gap-4">
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-start text-sm">
                <thead>
                  <tr className="text-[11px] text-slate-500">
                    <th className="py-2 font-medium">واریانت</th>
                    <th className="py-2 font-medium">قبل</th>
                    <th className="py-2 font-medium">بعد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {preview.changes.map((c) => (
                    <tr key={c.variant}>
                      <td className="py-2 text-white">
                        {c.productName}{" "}
                        <span
                          dir="ltr"
                          className="font-mono text-[11px] text-slate-500"
                        >
                          {c.sku}
                        </span>
                      </td>
                      <td className="py-2 text-slate-400">
                        {formatPrice(c.oldPrice)}
                      </td>
                      <td className="py-2 font-bold text-white">
                        {formatPrice(c.newPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreview(null)}
              >
                انصراف
              </Button>
              <Button
                size="sm"
                disabled={applyMutation.isPending}
                onClick={() => applyMutation.mutate(preview.body)}
              >
                اعمال {preview.changes.length.toLocaleString("fa-IR")} تغییر
              </Button>
            </div>
          </div>
        )}
      </Modal>
      {historyRow && (
        <HistoryModal row={historyRow} onClose={() => setHistoryRow(null)} />
      )}
    </div>
  );
}
