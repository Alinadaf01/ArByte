import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import {
  createTransaction,
  downloadStocktake,
  listInventory,
  setLowStockThreshold,
} from "@/lib/catalogApi";
import { useQueryFilters } from "@/lib/useQueryFilters";
import { useToast } from "@/lib/ToastContext";
import type { InventoryRow } from "@/types/catalog";

const PAGE_SIZE = 12;

function TransactionForm({
  row,
  onClose,
}: {
  row: InventoryRow;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [type, setType] = useState("STOCK_IN");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      createTransaction({ variant: row.variantId, type, quantity, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      toast.showSuccess("تراکنش ثبت شد.");
      onClose();
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "ثبت ناموفق بود.",
      ),
  });
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <p className="m-0 text-sm text-slate-300">
        {row.productName}{" "}
        <span dir="ltr" className="font-mono text-xs text-slate-500">
          ({row.sku})
        </span>{" "}
        — موجود فعلی: {row.quantity.toLocaleString("fa-IR")}
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="نوع" htmlFor="t-type">
          <Select
            id="t-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="STOCK_IN">ورود به انبار</option>
            <option value="STOCK_OUT">خروج از انبار</option>
            <option value="ADJUSTMENT">اصلاح (مثبت یا منفی)</option>
          </Select>
        </Field>
        <Field
          label="تعداد"
          htmlFor="t-qty"
          hint={
            type === "ADJUSTMENT" ? "برای کاهش عدد منفی وارد کنید." : undefined
          }
        >
          <Input
            id="t-qty"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </Field>
      </div>
      <Field label="دلیل (اجباری)" htmlFor="t-note">
        <Textarea
          id="t-note"
          required
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          انصراف
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={mutation.isPending || !note.trim() || quantity === 0}
        >
          ثبت
        </Button>
      </div>
    </form>
  );
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [filters, setFilters] = useQueryFilters({
    page: "1",
    search: "",
    isLow: "",
  });
  const page = Number(filters.page) || 1;
  const [txRow, setTxRow] = useState<InventoryRow | null>(null);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["inventory", filters],
    queryFn: () =>
      listInventory({
        page,
        search: filters.search || undefined,
        isLow: filters.isLow || undefined,
      }),
  });
  const threshold = useMutation({
    mutationFn: ({
      variantId,
      value,
    }: {
      variantId: string;
      value: number | null;
    }) => setLowStockThreshold(variantId, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.showSuccess("آستانه ذخیره شد.");
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "ذخیره ناموفق بود.",
      ),
  });
  const rows = data?.results ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="موجودی"
        description="موجود، رزرو (سفارش‌های باز) و قابل فروش هر واریانت؛ رزرو و آزادسازی فقط سیستمی‌اند."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              downloadStocktake().catch((e: Error) =>
                toast.showError(e.message),
              )
            }
          >
            <FileText className="size-4" /> برگه‌ی انبارگردانی
          </Button>
        }
      />
      <section className="glass-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-6 py-4">
          <Input
            className="w-56"
            placeholder="نام محصول یا SKU…"
            defaultValue={filters.search}
            onBlur={(e) => setFilters({ search: e.target.value, page: "1" })}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              setFilters({
                search: (e.target as HTMLInputElement).value,
                page: "1",
              })
            }
          />
          <Select
            className="w-auto"
            value={filters.isLow}
            onChange={(e) => setFilters({ isLow: e.target.value, page: "1" })}
          >
            <option value="">همه</option>
            <option value="true">فقط زیر آستانه</option>
          </Select>
        </div>
        {isError ? (
          <ErrorState
            description="دریافت موجودی ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && rows.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="ردیفی یافت نشد"
            description="واریانتی با این فیلتر نیست."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-start text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                    <th className="px-6 py-3 font-medium">واریانت</th>
                    <th className="px-4 py-3 font-medium">موجود</th>
                    <th className="px-4 py-3 font-medium">رزرو</th>
                    <th className="px-4 py-3 font-medium">قابل فروش</th>
                    <th className="px-4 py-3 font-medium">آستانه‌ی کم</th>
                    <th className="px-4 py-3 font-medium">عملیات</th>
                  </tr>
                </thead>
                {isPending ? (
                  <TableSkeleton rows={6} cols={6} />
                ) : (
                  <tbody className="divide-y divide-white/[0.04]">
                    {rows.map((r) => (
                      <tr key={r.variantId}>
                        <td className="px-6 py-3">
                          <p className="m-0 font-semibold text-white">
                            {r.productName}
                          </p>
                          <p className="m-0 text-[11px] text-slate-500">
                            <span dir="ltr" className="font-mono">
                              {r.sku}
                            </span>
                            {r.variantName ? ` · ${r.variantName}` : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-slate-200">
                          {r.quantity.toLocaleString("fa-IR")}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {r.reservedQuantity.toLocaleString("fa-IR")}
                        </td>
                        <td className="px-4 py-3">
                          <Chip
                            tone={
                              r.availableQuantity <= 0
                                ? "danger"
                                : r.isLow
                                  ? "warning"
                                  : "success"
                            }
                          >
                            {r.availableQuantity.toLocaleString("fa-IR")}
                          </Chip>
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min={0}
                            className="w-24"
                            aria-label={`آستانه‌ی ${r.sku}`}
                            defaultValue={r.lowStockThreshold ?? ""}
                            onBlur={(e) => {
                              const value =
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value);
                              if (value !== r.lowStockThreshold)
                                threshold.mutate({
                                  variantId: r.variantId,
                                  value,
                                });
                            }}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setTxRow(r)}
                          >
                            ثبت تراکنش
                          </Button>
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
        open={txRow !== null}
        onClose={() => setTxRow(null)}
        title="ثبت تراکنش دستی"
      >
        {txRow && (
          <TransactionForm row={txRow} onClose={() => setTxRow(null)} />
        )}
      </Modal>
    </div>
  );
}
