import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ShippingMethodFormModal } from "@/pages/settings/ShippingMethodFormModal";
import { listShippingMethods, deleteShippingMethod } from "@/lib/api";
import { formatPrice } from "@/lib/formatters";
import { useToast } from "@/lib/ToastContext";
import type { ShippingMethod } from "@/types/settings";

export function ShippingMethodsTab() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [formState, setFormState] = useState<{
    open: boolean;
    method: ShippingMethod | null;
  }>({
    open: false,
    method: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<ShippingMethod | null>(null);

  const {
    data: methods,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["shipping-methods"],
    queryFn: listShippingMethods,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteShippingMethod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-methods"] });
      toast.showSuccess("روش ارسال حذف شد.");
      setDeleteTarget(null);
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "حذف ناموفق بود.",
      ),
  });

  const rows = methods ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button onClick={() => setFormState({ open: true, method: null })}>
          + روش ارسال جدید
        </Button>
      </div>

      <section className="glass-card overflow-hidden p-0">
        {isError ? (
          <ErrorState
            description="دریافت روش‌های ارسال ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && rows.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="هنوز روش ارسالی ثبت نشده"
            action={
              <Button
                onClick={() => setFormState({ open: true, method: null })}
              >
                + روش ارسال جدید
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-start text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                  <th className="px-6 py-3 font-medium">نام</th>
                  <th className="px-4 py-3 font-medium">هزینه</th>
                  <th className="px-4 py-3 font-medium">رایگان بالای</th>
                  <th className="px-4 py-3 font-medium">زمان تخمینی</th>
                  <th className="px-4 py-3 font-medium">وضعیت</th>
                  <th className="px-4 py-3 font-medium">عملیات</th>
                </tr>
              </thead>
              {isPending ? (
                <TableSkeleton rows={3} cols={6} />
              ) : (
                <tbody className="divide-y divide-white/[0.04]">
                  {rows.map((method) => (
                    <tr key={method.id}>
                      <td className="px-6 py-3 font-semibold text-white">
                        {method.name}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {formatPrice(method.cost)}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {method.freeAbove ? formatPrice(method.freeAbove) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {method.estimatedDays || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Chip
                          tone={method.isActive ? "success" : "neutral"}
                          dot
                        >
                          {method.isActive ? "فعال" : "غیرفعال"}
                        </Chip>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setFormState({ open: true, method })}
                            aria-label="ویرایش"
                            className="icon-btn !h-8 !w-8"
                          >
                            <svg
                              className="size-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.8"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(method)}
                            aria-label="حذف"
                            className="icon-btn !h-8 !w-8 hover:!text-danger"
                          >
                            <svg
                              className="size-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.8"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        )}
      </section>

      <ShippingMethodFormModal
        open={formState.open}
        onClose={() => setFormState({ open: false, method: null })}
        method={formState.method}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={`حذف «${deleteTarget?.name ?? ""}»`}
        description="این عملیات قابل بازگشت نیست."
        confirmLabel="حذف"
        pending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
