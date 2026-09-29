import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderTree, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/Field";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ImageUrlField } from "@/components/ui/ImageUrlField";
import { deleteCategory, listCategories, saveCategory } from "@/lib/catalogApi";
import { useToast } from "@/lib/ToastContext";
import type { AdminCategory } from "@/types/catalog";

type Draft = Omit<AdminCategory, "id">;
const EMPTY: Draft = {
  name: "",
  slug: "",
  parent: null,
  description: "",
  imageMain: null,
  imageBanner: null,
  imageThumbnail: null,
  sortOrder: 0,
  isActive: true,
};

function CategoryForm({
  category,
  parents,
  onClose,
}: {
  category: AdminCategory | null;
  parents: AdminCategory[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(category ? { ...category } : EMPTY);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const mutation = useMutation({
    mutationFn: () => saveCategory(category?.id ?? null, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.showSuccess("دسته ذخیره شد.");
      onClose();
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "ذخیره ناموفق بود.",
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="نام" htmlFor="c-name">
          <Input
            id="c-name"
            required
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>
        <Field label="slug (لاتین)" htmlFor="c-slug">
          <Input
            id="c-slug"
            dir="ltr"
            required
            value={draft.slug}
            onChange={(e) => set("slug", e.target.value)}
          />
        </Field>
        <Field label="دسته‌ی والد" htmlFor="c-parent">
          <Select
            id="c-parent"
            value={draft.parent ?? ""}
            onChange={(e) =>
              set("parent", e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">— بدون والد —</option>
            {parents
              .filter((p) => p.id !== category?.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="ترتیب" htmlFor="c-order">
          <Input
            id="c-order"
            type="number"
            min={0}
            value={draft.sortOrder}
            onChange={(e) => set("sortOrder", Number(e.target.value))}
          />
        </Field>
      </div>
      <Field label="توضیح" htmlFor="c-desc">
        <Textarea
          id="c-desc"
          value={draft.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ImageUrlField
          label="تصویر اصلی"
          folder="categories"
          value={draft.imageMain}
          onChange={(v) => set("imageMain", v)}
        />
        <ImageUrlField
          label="بنر"
          folder="categories"
          value={draft.imageBanner}
          onChange={(v) => set("imageBanner", v)}
        />
        <ImageUrlField
          label="بندانگشتی"
          folder="categories"
          value={draft.imageThumbnail}
          onChange={(v) => set("imageThumbnail", v)}
        />
      </div>
      <Switch
        checked={draft.isActive}
        onChange={(v) => set("isActive", v)}
        label="فعال در فروشگاه"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          انصراف
        </Button>
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          {mutation.isPending ? "در حال ذخیره…" : "ذخیره"}
        </Button>
      </div>
    </form>
  );
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<AdminCategory | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(),
  });
  const categories = data?.results ?? [];
  const byId = new Map(categories.map((c) => [Number(c.id), c]));
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.showSuccess("دسته حذف شد.");
      setDeleteTarget(null);
    },
    onError: (error: unknown) => {
      toast.showError(
        error instanceof Error ? error.message : "حذف ناموفق بود.",
      );
      setDeleteTarget(null);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="دسته‌بندی‌ها"
        description="دسته‌ها با سه تصویر (اصلی، بنر، بندانگشتی)، ترتیب و والد. دسته‌ی دارای محصول حذف نمی‌شود."
        actions={
          <Button onClick={() => setEditing("new")}>+ دسته‌ی جدید</Button>
        }
      />
      <section className="glass-card overflow-hidden p-0">
        {isError ? (
          <ErrorState
            description="دریافت دسته‌ها ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && categories.length === 0 ? (
          <EmptyState
            icon={FolderTree}
            title="دسته‌ای ثبت نشده"
            description="اولین دسته را بسازید."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-start text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                  <th className="px-6 py-3 font-medium">دسته</th>
                  <th className="px-4 py-3 font-medium">والد</th>
                  <th className="px-4 py-3 font-medium">ترتیب</th>
                  <th className="px-4 py-3 font-medium">وضعیت</th>
                  <th className="px-4 py-3 font-medium">عملیات</th>
                </tr>
              </thead>
              {isPending ? (
                <TableSkeleton rows={5} cols={5} />
              ) : (
                <tbody className="divide-y divide-white/[0.04]">
                  {categories.map((c) => (
                    <tr key={c.id}>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-800/60">
                            {(c.imageThumbnail || c.imageMain) && (
                              <img
                                src={c.imageThumbnail || c.imageMain || ""}
                                alt=""
                                className="size-full object-cover"
                              />
                            )}
                          </span>
                          <div>
                            <p className="m-0 font-semibold text-white">
                              {c.name}
                            </p>
                            <p
                              className="m-0 font-mono text-[11px] text-slate-500"
                              dir="ltr"
                            >
                              {c.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {c.parent ? (byId.get(c.parent)?.name ?? "—") : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {c.sortOrder.toLocaleString("fa-IR")}
                      </td>
                      <td className="px-4 py-3">
                        <Chip tone={c.isActive ? "success" : "neutral"}>
                          {c.isActive ? "فعال" : "غیرفعال"}
                        </Chip>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label={`ویرایش ${c.name}`}
                            onClick={() => setEditing(c)}
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            className="icon-btn hover:!text-danger"
                            aria-label={`حذف ${c.name}`}
                            onClick={() => setDeleteTarget(c)}
                          >
                            <Trash2 className="size-4" />
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
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "دسته‌ی جدید" : "ویرایش دسته"}
        widthClass="max-w-2xl"
      >
        {editing !== null && (
          <CategoryForm
            category={editing === "new" ? null : editing}
            parents={categories.filter((c) => !c.parent)}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={deleteTarget !== null}
        title="حذف دسته"
        description={`«${deleteTarget?.name}» حذف شود؟`}
        confirmLabel="حذف"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
