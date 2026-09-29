import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ticket } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pagination } from "@/components/ui/Pagination";
import { CouponFormModal } from "@/pages/coupons/CouponFormModal";
import { listCoupons, deleteCoupon } from "@/lib/api";
import { useQueryFilters } from "@/lib/useQueryFilters";
import { useToast } from "@/lib/ToastContext";
import { formatPrice } from "@/lib/formatters";
import type { AdminCoupon } from "@/types/coupon";

const PAGE_SIZE = 12;

export default function CouponsPage() {
  const [filters, setFilters] = useQueryFilters({ page: "1" });
  const page = Number(filters.page) || 1;
  const queryClient = useQueryClient();
  const toast = useToast();
  const [formTarget, setFormTarget] = useState<AdminCoupon | "new" | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<AdminCoupon | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["coupons", filters],
    queryFn: () => listCoupons({ page, pageSize: PAGE_SIZE }),
  });

  const coupons = data?.results ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCoupon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      toast.showSuccess("کوپن حذف شد.");
      setDeleteTarget(null);
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "حذف ناموفق بود.",
      ),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="کدهای تخفیف"
        description="مدیریت کوپن‌های تخفیف، محدودیت استفاده و بازه اعتبار."
        actions={
          <Button onClick={() => setFormTarget("new")}>+ افزودن کوپن</Button>
        }
      />

      <section className="glass-card overflow-hidden p-0">
        {isError ? (
          <ErrorState
            description="دریافت کوپن‌ها ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && coupons.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="کوپنی یافت نشد"
            description="هنوز کوپنی ثبت نشده."
            action={
              <Button onClick={() => setFormTarget("new")}>
                + افزودن کوپن
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-start text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                    <th className="px-6 py-3 font-medium">کد</th>
                    <th className="px-4 py-3 font-medium">مقدار</th>
                    <th className="px-4 py-3 font-medium">استفاده‌شده</th>
                    <th className="px-4 py-3 font-medium">اعتبار</th>
                    <th className="px-4 py-3 font-medium">وضعیت</th>
                    <th className="px-4 py-3 font-medium">عملیات</th>
                  </tr>
                </thead>
                {isPending ? (
                  <TableSkeleton rows={6} cols={6} />
                ) : (
                  <tbody className="divide-y divide-white/[0.04]">
                    {coupons.map((coupon) => (
                      <tr key={coupon.id}>
                        <td
                          className="px-6 py-3 font-semibold text-white"
                          dir="ltr"
                        >
                          {coupon.code}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {coupon.type === "percent"
                            ? `${coupon.value}٪`
                            : formatPrice(coupon.value)}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {coupon.usedCount.toLocaleString("fa-IR")}
                          {coupon.usageLimit
                            ? ` / ${coupon.usageLimit.toLocaleString("fa-IR")}`
                            : ""}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {coupon.startsAt || coupon.endsAt
                            ? `${coupon.startsAt?.slice(0, 10) ?? "—"} تا ${coupon.endsAt?.slice(0, 10) ?? "—"}`
                            : "نامحدود"}
                        </td>
                        <td className="px-4 py-3">
                          <Chip
                            tone={coupon.isActive ? "success" : "neutral"}
                            dot
                          >
                            {coupon.isActive ? "فعال" : "غیرفعال"}
                          </Chip>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setFormTarget(coupon)}
                              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-brand-500/30 hover:text-brand-300"
                            >
                              ویرایش
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(coupon)}
                              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:border-danger/40"
                            >
                              حذف
                            </button>
                          </div>
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

      <CouponFormModal
        coupon={formTarget && formTarget !== "new" ? formTarget : null}
        open={!!formTarget}
        onClose={() => setFormTarget(null)}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title={`حذف کوپن «${deleteTarget?.code ?? ""}»`}
        description="این عملیات قابل بازگشت نیست."
        confirmLabel="حذف"
        pending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
