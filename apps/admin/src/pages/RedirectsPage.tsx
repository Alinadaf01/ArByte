import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CornerUpLeft, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, Input, Select, Switch } from "@/components/ui/Field";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { deleteRedirect, listRedirects, saveRedirect } from "@/lib/api";
import { formatJalaliDateTime } from "@/lib/formatters";
import { useQueryFilters } from "@/lib/useQueryFilters";
import { useToast } from "@/lib/ToastContext";
import type { AdminRedirect, RedirectFormValues } from "@/types/redirect";

const PAGE_SIZE = 20;
const EMPTY: RedirectFormValues = {
  fromPath: "",
  toPath: "",
  statusCode: 301,
  isActive: true,
};

function RedirectForm({
  redirect,
  onClose,
}: {
  redirect: AdminRedirect | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<RedirectFormValues>(
    redirect
      ? {
          fromPath: redirect.fromPath,
          toPath: redirect.toPath,
          statusCode: redirect.statusCode,
          isActive: redirect.isActive,
        }
      : EMPTY,
  );
  const save = useMutation({
    mutationFn: () => saveRedirect(redirect?.id ?? null, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["redirects"] });
      toast.showSuccess(
        "ریدایرکت ذخیره شد؛ حداکثر تا یک دقیقه در فروشگاه اعمال می‌شود.",
      );
      onClose();
    },
    onError: (e: unknown) =>
      toast.showError(e instanceof Error ? e.message : "ذخیره ناموفق بود."),
  });
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <Field
        label="از مسیر"
        htmlFor="rd-from"
        hint="نسبی، مثلاً /products/old-slug"
      >
        <Input
          id="rd-from"
          dir="ltr"
          required
          value={draft.fromPath}
          onChange={(e) => setDraft({ ...draft, fromPath: e.target.value })}
        />
      </Field>
      <Field label="به مسیر" htmlFor="rd-to" hint="نسبی یا آدرس کامل">
        <Input
          id="rd-to"
          dir="ltr"
          required
          value={draft.toPath}
          onChange={(e) => setDraft({ ...draft, toPath: e.target.value })}
        />
      </Field>
      <Field label="نوع" htmlFor="rd-status">
        <Select
          id="rd-status"
          value={draft.statusCode}
          onChange={(e) =>
            setDraft({
              ...draft,
              statusCode: Number(e.target.value) as 301 | 302,
            })
          }
        >
          <option value={301}>دائمی (301)</option>
          <option value={302}>موقت (302)</option>
        </Select>
      </Field>
      <Switch
        checked={draft.isActive}
        onChange={(v) => setDraft({ ...draft, isActive: v })}
        label="فعال"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          انصراف
        </Button>
        <Button type="submit" size="sm" disabled={save.isPending}>
          ذخیره
        </Button>
      </div>
    </form>
  );
}

/** G-02 — ریدایرکت‌های فروشگاه؛ تغییر slug و حذف محصول خودکار ۳۰۱ می‌سازد. */
export default function RedirectsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useQueryFilters({
    page: "1",
    search: "",
    isAuto: "",
  });
  const page = Number(filters.page) || 1;
  const [editing, setEditing] = useState<AdminRedirect | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminRedirect | null>(null);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["redirects", filters],
    queryFn: () =>
      listRedirects({
        page,
        pageSize: PAGE_SIZE,
        search: filters.search || undefined,
        isAuto: filters.isAuto || undefined,
      }),
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteRedirect(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["redirects"] }),
    onError: (e: unknown) =>
      toast.showError(e instanceof Error ? e.message : "حذف ناموفق بود."),
    onSettled: () => setDeleteTarget(null),
  });
  const rows = data?.results ?? [];
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="ریدایرکت‌ها"
        description="تغییر slug محصول، دسته و نوشته، و حذف محصول، خودکار ریدایرکت ۳۰۱ می‌سازد؛ این‌جا دستی هم اضافه کنید."
        actions={<Button onClick={() => setEditing("new")}>+ ریدایرکت</Button>}
      />
      <section className="glass-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-6 py-4">
          <Input
            className="w-64"
            placeholder="جستجو در مسیرها"
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value, page: "1" })}
          />
          <Select
            className="w-auto"
            value={filters.isAuto}
            onChange={(e) => setFilters({ isAuto: e.target.value, page: "1" })}
          >
            <option value="">همه</option>
            <option value="true">خودکار</option>
            <option value="false">دستی</option>
          </Select>
        </div>
        {isError ? (
          <ErrorState
            description="دریافت ریدایرکت‌ها ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && rows.length === 0 ? (
          <EmptyState
            icon={CornerUpLeft}
            title="ریدایرکتی نیست"
            description="هنوز مسیری تغییر نکرده است."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-start text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                    <th className="px-6 py-3 font-medium">از</th>
                    <th className="px-4 py-3 font-medium">به</th>
                    <th className="px-4 py-3 font-medium">نوع</th>
                    <th className="px-4 py-3 font-medium">بازدید</th>
                    <th className="px-4 py-3 font-medium">وضعیت</th>
                    <th className="px-4 py-3 font-medium">عملیات</th>
                  </tr>
                </thead>
                {isPending ? (
                  <TableSkeleton rows={5} cols={6} />
                ) : (
                  <tbody className="divide-y divide-white/[0.04]">
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td
                          className="px-6 py-3 font-mono text-xs text-slate-300"
                          dir="ltr"
                        >
                          {r.fromPath}
                        </td>
                        <td
                          className="px-4 py-3 font-mono text-xs text-brand-300"
                          dir="ltr"
                        >
                          {r.toPath}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {r.statusCode}{" "}
                          {r.isAuto && <Chip tone="neutral">خودکار</Chip>}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {r.hits.toLocaleString("fa-IR")}
                          {r.lastHitAt && (
                            <span className="block text-[10px] text-slate-500">
                              {formatJalaliDateTime(r.lastHitAt)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Chip tone={r.isActive ? "success" : "neutral"}>
                            {r.isActive ? "فعال" : "غیرفعال"}
                          </Chip>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              className="icon-btn"
                              aria-label={`ویرایش ${r.fromPath}`}
                              onClick={() => setEditing(r)}
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              className="icon-btn hover:!text-danger"
                              aria-label={`حذف ${r.fromPath}`}
                              onClick={() => setDeleteTarget(r)}
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
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "ریدایرکت تازه" : "ویرایش ریدایرکت"}
      >
        {editing !== null && (
          <RedirectForm
            redirect={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={deleteTarget !== null}
        title="حذف ریدایرکت"
        description={`ریدایرکت «${deleteTarget?.fromPath}» حذف شود؟`}
        confirmLabel="حذف"
        pending={remove.isPending}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
