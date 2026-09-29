import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { RoleFormModal } from "@/pages/roles/RoleFormModal";
import { listRoles, listSections, deleteRole } from "@/lib/api";
import { useToast } from "@/lib/ToastContext";
import type { AdminRole } from "@/types/role";

export default function RolesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [formTarget, setFormTarget] = useState<AdminRole | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminRole | null>(null);

  const {
    data: roles,
    isPending,
    isError,
    refetch,
  } = useQuery({ queryKey: ["roles"], queryFn: listRoles });
  const { data: sections } = useQuery({
    queryKey: ["role-sections"],
    queryFn: listSections,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.showSuccess("نقش حذف شد.");
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
        title="مدیریت نقش‌ها و دسترسی"
        description="هر نقش، ترکیبی از بخش‌ها و عمل‌های مجاز است. بخش‌های حساس (⚠) در نقش جدید به‌طور پیش‌فرض خاموش‌اند."
        actions={
          sections && (
            <Button onClick={() => setFormTarget("new")}>+ نقش جدید</Button>
          )
        }
      />

      <section className="glass-card overflow-hidden p-0">
        {isError ? (
          <ErrorState
            description="دریافت نقش‌ها ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && (roles ?? []).length === 0 ? (
          <EmptyState icon={Shield} title="نقشی یافت نشد" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-start text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                  <th className="px-6 py-3 font-medium">نام</th>
                  <th className="px-4 py-3 font-medium">توضیحات</th>
                  <th className="px-4 py-3 font-medium">بخش‌های مجاز</th>
                  <th className="px-4 py-3 font-medium">نوع</th>
                  <th className="px-4 py-3 font-medium">عملیات</th>
                </tr>
              </thead>
              {isPending ? (
                <TableSkeleton rows={5} cols={5} />
              ) : (
                <tbody className="divide-y divide-white/[0.04]">
                  {(roles ?? []).map((role) => (
                    <tr key={role.id}>
                      <td className="px-6 py-3 font-semibold text-white">
                        {role.name}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {role.description || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {Object.keys(role.grants).length.toLocaleString(
                          "fa-IR",
                        )}{" "}
                        بخش
                      </td>
                      <td className="px-4 py-3">
                        <Chip tone={role.isSystem ? "warning" : "neutral"} dot>
                          {role.isSystem ? "پیش‌فرض سیستم" : "سفارشی"}
                        </Chip>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setFormTarget(role)}
                            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-brand-500/30 hover:text-brand-300"
                          >
                            ویرایش
                          </button>
                          {!role.isSystem && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(role)}
                              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:border-danger/40"
                            >
                              حذف
                            </button>
                          )}
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

      {sections && (
        <RoleFormModal
          role={formTarget}
          sections={sections}
          open={!!formTarget}
          onClose={() => setFormTarget(null)}
        />
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        title={`حذف نقش «${deleteTarget?.name ?? ""}»`}
        description="کاربرانی که این نقش را دارند، تا انتخاب نقش جدید هیچ دسترسی نخواهند داشت."
        confirmLabel="حذف"
        pending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
