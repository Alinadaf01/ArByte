import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { Pagination } from "@/components/ui/Pagination";
import {
  listReturns,
  approveReturn,
  rejectReturn,
  markReturnReceived,
  markReturnRefunded,
} from "@/lib/api";
import { useQueryFilters } from "@/lib/useQueryFilters";
import { useToast } from "@/lib/ToastContext";
import { formatJalaliDateTime } from "@/lib/formatters";
import { RETURN_STATUS_LABELS, type ReturnStatus } from "@/types/return";

const PAGE_SIZE = 12;

const STATUS_TONE: Record<
  ReturnStatus,
  "warning" | "brand" | "success" | "danger"
> = {
  requested: "warning",
  approved: "brand",
  received: "brand",
  refunded: "success",
  rejected: "danger",
};

export default function ReturnsPage() {
  const [filters, setFilters] = useQueryFilters({ page: "1", status: "" });
  const page = Number(filters.page) || 1;
  const queryClient = useQueryClient();
  const toast = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["returns", filters],
    queryFn: () =>
      listReturns({
        page,
        pageSize: PAGE_SIZE,
        status: filters.status || undefined,
      }),
  });

  const returns = data?.results ?? [];

  const transitionMutation = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: (id: string) => Promise<unknown>;
    }) => action(id),
    onMutate: ({ id }) => setPendingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      toast.showSuccess("وضعیت مرجوعی به‌روزرسانی شد.");
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "عملیات ناموفق بود.",
      ),
    onSettled: () => setPendingId(null),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="مرجوعی‌ها"
        description="گردش کار تأیید، دریافت و بازپرداخت مرجوعی سفارش‌ها."
      />

      <section className="glass-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-6 py-4">
          <Select
            className="w-auto"
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value, page: "1" })}
          >
            <option value="">همه وضعیت‌ها</option>
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
        ) : !isPending && returns.length === 0 ? (
          <EmptyState
            icon={RotateCcw}
            title="مرجوعی‌ای یافت نشد"
            description="هنوز درخواست مرجوعی‌ای ثبت نشده."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-start text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                    <th className="px-6 py-3 font-medium">سفارش</th>
                    <th className="px-4 py-3 font-medium">اقلام</th>
                    <th className="px-4 py-3 font-medium">دلیل</th>
                    <th className="px-4 py-3 font-medium">وضعیت</th>
                    <th className="px-4 py-3 font-medium">تاریخ</th>
                    <th className="px-4 py-3 font-medium">عملیات</th>
                  </tr>
                </thead>
                {isPending ? (
                  <TableSkeleton rows={6} cols={6} />
                ) : (
                  <tbody className="divide-y divide-white/[0.04]">
                    {returns.map((ret) => {
                      const isPendingRow =
                        pendingId === ret.id && transitionMutation.isPending;
                      return (
                        <tr key={ret.id}>
                          <td className="px-6 py-3">
                            <Link
                              to={`/orders/${ret.order}`}
                              className="font-semibold text-brand-300 hover:underline"
                            >
                              سفارش #{ret.order}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-slate-400">
                            {ret.items.length.toLocaleString("fa-IR")} قلم
                          </td>
                          <td className="max-w-64 truncate px-4 py-3 text-slate-400">
                            {ret.reason || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <Chip tone={STATUS_TONE[ret.status]} dot>
                              {RETURN_STATUS_LABELS[ret.status]}
                            </Chip>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {formatJalaliDateTime(ret.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {ret.status === "requested" && (
                                <>
                                  <Button
                                    size="sm"
                                    disabled={isPendingRow}
                                    onClick={() =>
                                      transitionMutation.mutate({
                                        id: ret.id,
                                        action: approveReturn,
                                      })
                                    }
                                  >
                                    تأیید
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    disabled={isPendingRow}
                                    onClick={() =>
                                      transitionMutation.mutate({
                                        id: ret.id,
                                        action: rejectReturn,
                                      })
                                    }
                                  >
                                    رد
                                  </Button>
                                </>
                              )}
                              {ret.status === "approved" && (
                                <Button
                                  size="sm"
                                  disabled={isPendingRow}
                                  onClick={() =>
                                    transitionMutation.mutate({
                                      id: ret.id,
                                      action: markReturnReceived,
                                    })
                                  }
                                >
                                  ثبت دریافت کالا
                                </Button>
                              )}
                              {ret.status === "received" && (
                                <Button
                                  size="sm"
                                  disabled={isPendingRow}
                                  onClick={() =>
                                    transitionMutation.mutate({
                                      id: ret.id,
                                      action: markReturnRefunded,
                                    })
                                  }
                                >
                                  ثبت بازپرداخت
                                </Button>
                              )}
                              {(ret.status === "refunded" ||
                                ret.status === "rejected") && (
                                <span className="text-[11px] text-slate-500">
                                  وضعیت نهایی
                                </span>
                              )}
                            </div>
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
    </div>
  );
}
