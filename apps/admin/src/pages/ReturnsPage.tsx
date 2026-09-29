import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Undo2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import { Select, Textarea } from "@/components/ui/Field";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import {
  decideReturn,
  listReturns,
  markReturnReceived,
  markReturnRefunded,
} from "@/lib/api";
import { formatJalaliDateTime } from "@/lib/formatters";
import { useQueryFilters } from "@/lib/useQueryFilters";
import { useToast } from "@/lib/ToastContext";
import {
  RETURN_STATUS_LABELS,
  type AdminReturn,
  type ReturnStatus,
} from "@/types/return";

const PAGE_SIZE = 12;
const TONE: Record<
  ReturnStatus,
  "warning" | "brand" | "danger" | "success" | "neutral"
> = {
  REQUESTED: "warning",
  APPROVED: "brand",
  REJECTED: "danger",
  RECEIVED: "success",
  REFUNDED: "neutral",
};

function ReturnDetail({
  ret,
  onClose,
}: {
  ret: AdminReturn;
  onClose: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [approved, setApproved] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(ret.items.map((i) => [i.id, true])),
  );
  const [note, setNote] = useState(ret.adminNote ?? "");
  const done = (message: string) => {
    queryClient.invalidateQueries({ queryKey: ["returns"] });
    toast.showSuccess(message);
    onClose();
  };
  const onError = (error: unknown) =>
    toast.showError(
      error instanceof Error ? error.message : "عملیات ناموفق بود.",
    );
  const decide = useMutation({
    mutationFn: () =>
      decideReturn(
        ret.id,
        ret.items.map((i) => ({ id: i.id, approved: approved[i.id] })),
        note,
      ),
    onSuccess: (r) =>
      done(r.status === "REJECTED" ? "درخواست رد شد." : "تصمیم ثبت شد."),
    onError,
  });
  const receive = useMutation({
    mutationFn: () => markReturnReceived(ret.id),
    onSuccess: () => done("دریافت ثبت شد؛ قلم‌های تأییدشده به انبار برگشتند."),
    onError,
  });
  const refund = useMutation({
    mutationFn: () => markReturnRefunded(ret.id),
    onSuccess: () => done("بازپرداخت ثبت شد."),
    onError,
  });
  const editable = ret.status === "REQUESTED";

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm text-slate-300">
        <p className="m-0">
          سفارش{" "}
          <Link
            to={`/orders/${ret.order}`}
            className="font-mono text-brand-300"
            dir="ltr"
          >
            {ret.orderNumber}
          </Link>{" "}
          · {ret.customerName} <span dir="ltr">({ret.customerPhone})</span>
        </p>
        <p className="m-0 mt-2 text-white">دلیل: {ret.reason}</p>
        {ret.description && (
          <p className="m-0 mt-1 text-slate-400">{ret.description}</p>
        )}
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {ret.items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <p className="m-0 truncate text-white">
                {item.productName}{" "}
                {item.variantName && (
                  <span className="text-slate-400">· {item.variantName}</span>
                )}
              </p>
              <p className="m-0 text-[11px] text-slate-500">
                <span dir="ltr" className="font-mono">
                  {item.sku}
                </span>{" "}
                · تعداد {item.quantity.toLocaleString("fa-IR")}
              </p>
            </div>
            {editable ? (
              <Select
                className="w-28"
                aria-label={`تصمیم ${item.sku}`}
                value={approved[item.id] ? "yes" : "no"}
                onChange={(e) =>
                  setApproved((a) => ({
                    ...a,
                    [item.id]: e.target.value === "yes",
                  }))
                }
              >
                <option value="yes">تأیید</option>
                <option value="no">رد</option>
              </Select>
            ) : (
              <Chip
                tone={
                  item.decision === "REJECTED"
                    ? "danger"
                    : item.decision === "APPROVED"
                      ? "success"
                      : "neutral"
                }
              >
                {item.decision === "REJECTED"
                  ? "رد"
                  : item.decision === "APPROVED"
                    ? "تأیید"
                    : "در انتظار"}
              </Chip>
            )}
          </li>
        ))}
      </ul>
      {editable && (
        <Textarea
          placeholder="یادداشت ادمین (دلیل رد و…)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      )}
      {!editable && ret.adminNote && (
        <p className="m-0 text-xs text-slate-400">یادداشت: {ret.adminNote}</p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {editable && (
          <Button
            size="sm"
            disabled={decide.isPending}
            onClick={() => decide.mutate()}
          >
            ثبت تصمیم
          </Button>
        )}
        {ret.status === "APPROVED" && (
          <Button
            size="sm"
            disabled={receive.isPending}
            onClick={() => receive.mutate()}
          >
            کالا دریافت شد (ورود به انبار)
          </Button>
        )}
        {ret.status === "RECEIVED" && (
          <Button
            size="sm"
            disabled={refund.isPending}
            onClick={() => refund.mutate()}
          >
            مبلغ بازگردانده شد
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ReturnsPage() {
  const [filters, setFilters] = useQueryFilters({ page: "1", status: "" });
  const page = Number(filters.page) || 1;
  const [open, setOpen] = useState<AdminReturn | null>(null);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["returns", filters],
    queryFn: () =>
      listReturns({
        page,
        pageSize: PAGE_SIZE,
        status: filters.status || undefined,
      }),
  });
  const rows = data?.results ?? [];
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="مرجوعی‌ها"
        description="بررسی قلم‌به‌قلم؛ با «دریافت کالا» فقط قلم‌های تأییدشده به انبار برمی‌گردند."
      />
      <section className="glass-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-6 py-4">
          <Select
            className="w-auto"
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value, page: "1" })}
          >
            <option value="">همه‌ی وضعیت‌ها</option>
            {Object.entries(RETURN_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        {isError ? (
          <ErrorState
            description="دریافت مرجوعی‌ها ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && rows.length === 0 ? (
          <EmptyState
            icon={Undo2}
            title="مرجوعی‌ای نیست"
            description="با این فیلتر درخواستی ثبت نشده است."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-start text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                    <th className="px-6 py-3 font-medium">سفارش</th>
                    <th className="px-4 py-3 font-medium">مشتری</th>
                    <th className="px-4 py-3 font-medium">اقلام</th>
                    <th className="px-4 py-3 font-medium">زمان</th>
                    <th className="px-4 py-3 font-medium">وضعیت</th>
                  </tr>
                </thead>
                {isPending ? (
                  <TableSkeleton rows={5} cols={5} />
                ) : (
                  <tbody className="divide-y divide-white/[0.04]">
                    {rows.map((r) => (
                      <tr
                        key={r.id}
                        className="cursor-pointer hover:bg-white/[0.02]"
                        onClick={() => setOpen(r)}
                      >
                        <td
                          className="px-6 py-3 font-mono text-xs text-brand-300"
                          dir="ltr"
                        >
                          {r.orderNumber}
                        </td>
                        <td className="px-4 py-3 text-white">
                          {r.customerName}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {r.items.length.toLocaleString("fa-IR")} قلم
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {formatJalaliDateTime(r.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Chip tone={TONE[r.status]}>
                            {RETURN_STATUS_LABELS[r.status]}
                          </Chip>
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
        open={open !== null}
        onClose={() => setOpen(null)}
        title="درخواست مرجوعی"
        widthClass="max-w-2xl"
      >
        {open && <ReturnDetail ret={open} onClose={() => setOpen(null)} />}
      </Modal>
    </div>
  );
}
