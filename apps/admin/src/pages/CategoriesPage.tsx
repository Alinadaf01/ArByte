import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderTree } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CategoryFormModal } from "@/pages/categories/CategoryFormModal";
import { CategoryRow } from "@/pages/categories/CategoryRow";
import { listCategories, deleteCategory } from "@/lib/api";
import { useToast } from "@/lib/ToastContext";
import type { AdminCategory } from "@/types/category";

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [formState, setFormState] = useState<{
    open: boolean;
    category: AdminCategory | null;
  }>({
    open: false,
    category: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories({ pageSize: 100 }),
  });

  const categories = useMemo(() => data?.results ?? [], [data]);
  const rows = useMemo(() => {
    const topLevel = categories.filter((c) => c.parent === null);
    const result: { category: AdminCategory; isChild: boolean }[] = [];
    for (const top of topLevel) {
      result.push({ category: top, isChild: false });
      for (const child of categories.filter(
        (c) => c.parent !== null && String(c.parent) === top.id,
      )) {
        result.push({ category: child, isChild: true });
      }
    }
    return result;
  }, [categories]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.showSuccess("دسته‌بندی حذف شد.");
      setDeleteTarget(null);
    },
    onError: (error: unknown) => {
      toast.showError(
        error instanceof Error ? error.message : "حذف ناموفق بود.",
      );
    },
  });

  const childCount = deleteTarget
    ? categories.filter(
        (c) => c.parent !== null && String(c.parent) === deleteTarget.id,
      ).length
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="دسته‌بندی‌ها"
        description="مدیریت دسته‌بندی‌های دوسطحی محصولات، ترتیب نمایش، و فعال/غیرفعال کردن."
        actions={
          <Button onClick={() => setFormState({ open: true, category: null })}>
            + دسته‌بندی جدید
          </Button>
        }
      />

      <section className="glass-card overflow-hidden p-0">
        {isError ? (
          <ErrorState
            description="دریافت دسته‌بندی‌ها ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && rows.length === 0 ? (
          <EmptyState
            icon={FolderTree}
            title="هنوز دسته‌بندی‌ای ثبت نشده"
            description="اولین دسته‌بندی فروشگاه را ایجاد کنید تا محصولات بتوانند به آن اختصاص یابند."
            action={
              <Button
                onClick={() => setFormState({ open: true, category: null })}
              >
                + دسته‌بندی جدید
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-start text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                  <th className="px-6 py-3 font-medium">دسته‌بندی</th>
                  <th className="px-4 py-3 font-medium">ترتیب</th>
                  <th className="px-4 py-3 font-medium">وضعیت</th>
                  <th className="px-4 py-3 font-medium">عملیات</th>
                </tr>
              </thead>
              {isPending ? (
                <TableSkeleton rows={5} cols={4} />
              ) : (
                <tbody className="divide-y divide-white/[0.04]">
                  {rows.map(({ category, isChild }) => (
                    <CategoryRow
                      key={category.id}
                      category={category}
                      isChild={isChild}
                      onEdit={() => setFormState({ open: true, category })}
                      onDelete={() => setDeleteTarget(category)}
                    />
                  ))}
                </tbody>
              )}
            </table>
          </div>
        )}
      </section>

      <CategoryFormModal
        open={formState.open}
        onClose={() => setFormState({ open: false, category: null })}
        category={formState.category}
        parentOptions={categories}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={`حذف «${deleteTarget?.name ?? ""}»`}
        description={
          childCount > 0
            ? `این دسته‌بندی ${childCount.toLocaleString("fa-IR")} زیردسته دارد که همراه آن حذف می‌شوند. این عملیات قابل بازگشت نیست.`
            : "این عملیات قابل بازگشت نیست."
        }
        confirmLabel="حذف"
        pending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
