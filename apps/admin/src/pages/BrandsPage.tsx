import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Switch, Textarea } from "@/components/ui/Field";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ImageUrlField } from "@/components/ui/ImageUrlField";
import { deleteBrand, listBrands, saveBrand } from "@/lib/catalogApi";
import { useToast } from "@/lib/ToastContext";
import type { AdminBrand } from "@/types/catalog";

type Draft = Pick<
  AdminBrand,
  "name" | "slug" | "logoUrl" | "description" | "isActive"
>;

function BrandForm({
  brand,
  onClose,
}: {
  brand: AdminBrand | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(
    brand
      ? {
          name: brand.name,
          slug: brand.slug,
          logoUrl: brand.logoUrl,
          description: brand.description,
          isActive: brand.isActive,
        }
      : { name: "", slug: "", logoUrl: null, description: "", isActive: true },
  );
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const mutation = useMutation({
    mutationFn: () => saveBrand(brand?.id ?? null, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.showSuccess("برند ذخیره شد.");
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
        <Field label="نام" htmlFor="b-name">
          <Input
            id="b-name"
            required
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>
        <Field label="slug (لاتین)" htmlFor="b-slug">
          <Input
            id="b-slug"
            dir="ltr"
            required
            value={draft.slug}
            onChange={(e) => set("slug", e.target.value)}
          />
        </Field>
      </div>
      <ImageUrlField
        label="لوگو"
        folder="brands"
        value={draft.logoUrl}
        onChange={(v) => set("logoUrl", v)}
      />
      <Field label="توضیح" htmlFor="b-desc">
        <Textarea
          id="b-desc"
          value={draft.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
        />
      </Field>
      <Switch
        checked={draft.isActive}
        onChange={(v) => set("isActive", v)}
        label="فعال"
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

export default function BrandsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<AdminBrand | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminBrand | null>(null);
  const {
    data: brands = [],
    isPending,
    isError,
    refetch,
  } = useQuery({ queryKey: ["brands"], queryFn: () => listBrands() });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBrand(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.showSuccess("برند حذف شد.");
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "حذف ناموفق بود.",
      ),
    onSettled: () => setDeleteTarget(null),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="برندها"
        description="برند با لوگو و توضیح؛ برند دارای محصول فعال حذف نمی‌شود."
        actions={<Button onClick={() => setEditing("new")}>+ برند جدید</Button>}
      />
      <section className="glass-card overflow-hidden p-0">
        {isError ? (
          <ErrorState
            description="دریافت برندها ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && brands.length === 0 ? (
          <EmptyState
            icon={BadgeCheck}
            title="برندی ثبت نشده"
            description="اولین برند را اضافه کنید."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-start text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                  <th className="px-6 py-3 font-medium">برند</th>
                  <th className="px-4 py-3 font-medium">محصول</th>
                  <th className="px-4 py-3 font-medium">وضعیت</th>
                  <th className="px-4 py-3 font-medium">عملیات</th>
                </tr>
              </thead>
              {isPending ? (
                <TableSkeleton rows={4} cols={4} />
              ) : (
                <tbody className="divide-y divide-white/[0.04]">
                  {brands.map((b) => (
                    <tr key={b.id}>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/90">
                            {b.logoUrl && (
                              <img
                                src={b.logoUrl}
                                alt=""
                                className="size-full object-contain p-1"
                              />
                            )}
                          </span>
                          <div>
                            <p className="m-0 font-semibold text-white">
                              {b.name}
                            </p>
                            <p
                              className="m-0 font-mono text-[11px] text-slate-500"
                              dir="ltr"
                            >
                              {b.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {b.productsCount.toLocaleString("fa-IR")}
                      </td>
                      <td className="px-4 py-3">
                        <Chip tone={b.isActive ? "success" : "neutral"}>
                          {b.isActive ? "فعال" : "غیرفعال"}
                        </Chip>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label={`ویرایش ${b.name}`}
                            onClick={() => setEditing(b)}
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            className="icon-btn hover:!text-danger"
                            aria-label={`حذف ${b.name}`}
                            onClick={() => setDeleteTarget(b)}
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
        title={editing === "new" ? "برند جدید" : "ویرایش برند"}
      >
        {editing !== null && (
          <BrandForm
            brand={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={deleteTarget !== null}
        title="حذف برند"
        description={`«${deleteTarget?.name}» حذف شود؟`}
        confirmLabel="حذف"
        pending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
