import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ListChecks } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AttributeFormModal } from "@/pages/specs/AttributeFormModal";
import { AttributeValuesModal } from "@/pages/specs/AttributeValuesModal";
import { AttributeRow } from "@/pages/specs/AttributeRow";
import { listAttributes, listCategories, deleteAttribute } from "@/lib/api";
import { useQueryFilters } from "@/lib/useQueryFilters";
import { useToast } from "@/lib/ToastContext";
import type { Attribute } from "@/types/attribute";

export default function SpecsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [filters, setFilters] = useQueryFilters({ category: "" });
  const [formState, setFormState] = useState<{
    open: boolean;
    attribute: Attribute | null;
  }>({
    open: false,
    attribute: null,
  });
  const [valuesTarget, setValuesTarget] = useState<Attribute | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Attribute | null>(null);

  const categoryId = filters.category ? Number(filters.category) : undefined;

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories({ pageSize: 100 }),
  });
  const categoryList = useMemo(() => categories?.results ?? [], [categories]);
  const categoriesById = useMemo(
    () => new Map(categoryList.map((c) => [c.id, c])),
    [categoryList],
  );

  const {
    data: attributes,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["attributes", categoryId],
    queryFn: () => listAttributes(categoryId),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAttribute(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
      toast.showSuccess("مشخصه حذف شد.");
      setDeleteTarget(null);
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "حذف ناموفق بود.",
      ),
  });

  const rows = attributes ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="مشخصات محصولات"
        description="فیلدهای پویای مشخصات فنی به تفکیک دسته‌بندی، و مقادیر قابل‌انتخاب هر فیلد."
        actions={
          <Button onClick={() => setFormState({ open: true, attribute: null })}>
            + مشخصه جدید
          </Button>
        }
      />

      <section className="glass-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] px-6 py-4">
          <Select
            className="w-auto"
            value={filters.category}
            onChange={(e) => setFilters({ category: e.target.value })}
          >
            <option value="">همه دسته‌بندی‌ها</option>
            {categoryList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        {isError ? (
          <ErrorState
            description="دریافت مشخصات ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && rows.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="مشخصه‌ای یافت نشد"
            description="برای این دسته‌بندی هنوز مشخصه‌ای تعریف نشده. مشخصه جدید بسازید تا در فرم محصول قابل انتخاب باشد."
            action={
              <Button
                onClick={() => setFormState({ open: true, attribute: null })}
              >
                + مشخصه جدید
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-start text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                  <th className="px-6 py-3 font-medium">مشخصه</th>
                  <th className="px-4 py-3 font-medium">دسته‌بندی‌ها</th>
                  <th className="px-4 py-3 font-medium">نوع ورودی</th>
                  <th className="px-4 py-3 font-medium">الزامی</th>
                  <th className="px-4 py-3 font-medium">عملیات</th>
                </tr>
              </thead>
              {isPending ? (
                <TableSkeleton rows={5} cols={5} />
              ) : (
                <tbody className="divide-y divide-white/[0.04]">
                  {rows.map((attribute) => (
                    <AttributeRow
                      key={attribute.id}
                      attribute={attribute}
                      categoriesById={categoriesById}
                      onEdit={() => setFormState({ open: true, attribute })}
                      onManageValues={() => setValuesTarget(attribute)}
                      onDelete={() => setDeleteTarget(attribute)}
                    />
                  ))}
                </tbody>
              )}
            </table>
          </div>
        )}
      </section>

      <AttributeFormModal
        open={formState.open}
        onClose={() => setFormState({ open: false, attribute: null })}
        attribute={formState.attribute}
        categories={categoryList}
      />

      <AttributeValuesModal
        attribute={valuesTarget}
        onClose={() => setValuesTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={`حذف «${deleteTarget?.name ?? ""}»`}
        description="این مشخصه از تمام محصولاتی که آن را دارند حذف می‌شود. این عملیات قابل بازگشت نیست."
        confirmLabel="حذف"
        pending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
