import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Pencil, Tag, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pagination } from "@/components/ui/Pagination";
import {
  createDeviceLabel,
  deleteDeviceLabel,
  downloadDeviceLabelPdf,
  listDeviceLabels,
  updateDeviceLabel,
} from "@/lib/api";
import { formatJalaliDateTime } from "@/lib/formatters";
import { useToast } from "@/lib/ToastContext";
import { useQueryFilters } from "@/lib/useQueryFilters";
import {
  PRODUCT_GRADE_OPTIONS,
  type AdminDeviceLabel,
  type DeviceLabelFormValues,
} from "@/types/deviceLabel";

const PAGE_SIZE = 20;

const EMPTY_DRAFT: DeviceLabelFormValues = {
  code: "",
  deviceName: "",
  modelNumber: "",
  cpu: "",
  ram: "",
  storage: "",
  display: "",
  batteryHealthPercent: null,
  batteryCycleCount: null,
  storageHealthPercent: null,
  grade: "",
  defectNotes: "",
};

function DeviceLabelForm({
  label,
  onClose,
}: {
  label: AdminDeviceLabel | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [draft, setDraft] = useState<DeviceLabelFormValues>(
    label
      ? {
          code: label.code,
          deviceName: label.deviceName,
          modelNumber: label.modelNumber,
          cpu: label.cpu,
          ram: label.ram,
          storage: label.storage,
          display: label.display,
          batteryHealthPercent: label.batteryHealthPercent,
          batteryCycleCount: label.batteryCycleCount,
          storageHealthPercent: label.storageHealthPercent,
          grade: label.grade,
          defectNotes: label.defectNotes,
        }
      : EMPTY_DRAFT,
  );
  const set = <K extends keyof DeviceLabelFormValues>(
    key: K,
    value: DeviceLabelFormValues[K],
  ) => setDraft((d) => ({ ...d, [key]: value }));

  const mutation = useMutation({
    mutationFn: () =>
      label ? updateDeviceLabel(label.id, draft) : createDeviceLabel(draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-labels"] });
      toast.showSuccess("لیبل ذخیره شد.");
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
        <Field label="کد دستگاه" htmlFor="dl-code" required>
          <Input
            id="dl-code"
            dir="ltr"
            required
            value={draft.code}
            onChange={(e) => set("code", e.target.value)}
          />
        </Field>
        <Field label="نام دستگاه" htmlFor="dl-name" required>
          <Input
            id="dl-name"
            required
            value={draft.deviceName}
            onChange={(e) => set("deviceName", e.target.value)}
          />
        </Field>
        <Field label="مدل" htmlFor="dl-model">
          <Input
            id="dl-model"
            value={draft.modelNumber}
            onChange={(e) => set("modelNumber", e.target.value)}
          />
        </Field>
        <Field label="گرید">
          <Select
            value={draft.grade}
            onChange={(e) => set("grade", e.target.value)}
          >
            <option value="">—</option>
            {PRODUCT_GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="پردازنده (CPU)" htmlFor="dl-cpu">
          <Input
            id="dl-cpu"
            value={draft.cpu}
            onChange={(e) => set("cpu", e.target.value)}
          />
        </Field>
        <Field label="حافظه رم" htmlFor="dl-ram">
          <Input
            id="dl-ram"
            value={draft.ram}
            onChange={(e) => set("ram", e.target.value)}
          />
        </Field>
        <Field label="حافظه داخلی" htmlFor="dl-storage">
          <Input
            id="dl-storage"
            value={draft.storage}
            onChange={(e) => set("storage", e.target.value)}
          />
        </Field>
        <Field label="نمایشگر" htmlFor="dl-display">
          <Input
            id="dl-display"
            value={draft.display}
            onChange={(e) => set("display", e.target.value)}
          />
        </Field>
        <Field label="سلامت باتری (٪)" htmlFor="dl-battery-health">
          <Input
            id="dl-battery-health"
            type="number"
            min={0}
            max={100}
            dir="ltr"
            value={draft.batteryHealthPercent ?? ""}
            onChange={(e) =>
              set(
                "batteryHealthPercent",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
          />
        </Field>
        <Field label="سایکل باتری" htmlFor="dl-battery-cycle">
          <Input
            id="dl-battery-cycle"
            type="number"
            min={0}
            dir="ltr"
            value={draft.batteryCycleCount ?? ""}
            onChange={(e) =>
              set(
                "batteryCycleCount",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
          />
        </Field>
        <Field label="سلامت هارد (٪)" htmlFor="dl-storage-health">
          <Input
            id="dl-storage-health"
            type="number"
            min={0}
            max={100}
            dir="ltr"
            value={draft.storageHealthPercent ?? ""}
            onChange={(e) =>
              set(
                "storageHealthPercent",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
          />
        </Field>
      </div>
      <Field
        label="ایرادها/نکات"
        htmlFor="dl-defects"
        hint="مثلاً «هاله مشکی دارد»"
      >
        <Textarea
          id="dl-defects"
          value={draft.defectNotes}
          onChange={(e) => set("defectNotes", e.target.value)}
        />
      </Field>
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

export default function DeviceLabelsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [filters, setFilters] = useQueryFilters({ page: "1", search: "" });
  const page = Number(filters.page) || 1;
  const [editing, setEditing] = useState<AdminDeviceLabel | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminDeviceLabel | null>(
    null,
  );
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["device-labels", filters],
    queryFn: () =>
      listDeviceLabels({
        page,
        pageSize: PAGE_SIZE,
        search: filters.search || undefined,
      }),
  });
  const labels = data?.results ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDeviceLabel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device-labels"] });
      toast.showSuccess("لیبل حذف شد.");
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "حذف ناموفق بود.",
      ),
    onSettled: () => setDeleteTarget(null),
  });

  async function download(label: AdminDeviceLabel) {
    setDownloadingId(label.id);
    try {
      await downloadDeviceLabelPdf(label.id, label.code);
    } catch (error) {
      toast.showError(
        error instanceof Error ? error.message : "دانلود لیبل ناموفق بود.",
      );
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="لیبل دستگاه"
        description="لیبل داخلی مشخصات دستگاه (فقط بک‌اند) — برای چسباندن روی جعبه هنگام بسته‌بندی/ارسال، هرگز برای مشتری نیست."
        actions={<Button onClick={() => setEditing("new")}>+ لیبل جدید</Button>}
      />

      <section className="glass-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-6 py-4">
          <Input
            className="w-64"
            placeholder="جست‌وجوی کد یا نام دستگاه…"
            defaultValue={filters.search}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                setFilters({
                  search: (e.target as HTMLInputElement).value,
                  page: "1",
                });
            }}
            onBlur={(e) => setFilters({ search: e.target.value, page: "1" })}
          />
        </div>

        {isError ? (
          <ErrorState
            description="دریافت لیبل‌ها ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && labels.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="لیبلی ثبت نشده"
            description="اولین لیبل دستگاه را بساز."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-start text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                    <th className="px-6 py-3 font-medium">کد</th>
                    <th className="px-4 py-3 font-medium">دستگاه</th>
                    <th className="px-4 py-3 font-medium">گرید</th>
                    <th className="px-4 py-3 font-medium">ثبت</th>
                    <th className="px-4 py-3 font-medium">عملیات</th>
                  </tr>
                </thead>
                {isPending ? (
                  <TableSkeleton rows={6} cols={5} />
                ) : (
                  <tbody className="divide-y divide-white/[0.04]">
                    {labels.map((label) => (
                      <tr key={label.id}>
                        <td
                          className="px-6 py-3 font-mono font-bold text-white"
                          dir="ltr"
                        >
                          {label.code}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {label.deviceName}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {label.gradeDisplay || "—"}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-500">
                          {formatJalaliDateTime(label.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              className="icon-btn"
                              aria-label={`دانلود PDF ${label.code}`}
                              disabled={downloadingId === label.id}
                              onClick={() => download(label)}
                            >
                              <Download className="size-4" />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              aria-label={`ویرایش ${label.code}`}
                              onClick={() => setEditing(label)}
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              className="icon-btn hover:!text-danger"
                              aria-label={`حذف ${label.code}`}
                              onClick={() => setDeleteTarget(label)}
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
        title={editing === "new" ? "لیبل جدید" : "ویرایش لیبل"}
      >
        {editing !== null && (
          <DeviceLabelForm
            label={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={deleteTarget !== null}
        title="حذف لیبل"
        description={`لیبل «${deleteTarget?.code}» حذف شود؟`}
        confirmLabel="حذف"
        pending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
