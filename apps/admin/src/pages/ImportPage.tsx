import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileDown, FileSpreadsheet, Upload } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Select } from "@/components/ui/Field";
import {
  downloadImportErrors,
  downloadImportTemplate,
  getImportJob,
  listImportJobs,
  previewImport,
  runImport,
  uploadImportFile,
} from "@/lib/catalogApi";
import { formatJalaliDateTime } from "@/lib/formatters";
import { useToast } from "@/lib/ToastContext";
import type { ImportJob, ImportPreviewRow } from "@/types/catalog";

const ACTION_CHIP: Record<
  ImportPreviewRow["action"],
  { label: string; tone: "success" | "brand" | "danger" }
> = {
  create: { label: "ایجاد", tone: "success" },
  update: { label: "به‌روزرسانی", tone: "brand" },
  error: { label: "خطا", tone: "danger" },
};
const STATUS_LABEL: Record<ImportJob["status"], string> = {
  PENDING: "در انتظار",
  PROCESSING: "در حال اجرا",
  COMPLETED: "انجام شد",
  FAILED: "ناموفق",
};

/** F-03 §۲ — آپلود → نگاشت ستون → پیش‌نمایش (بدون تغییر) → اجرا در پس‌زمینه → گزارش. */
export default function ImportPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [job, setJob] = useState<ImportJob | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{
    summary: { create: number; update: number; error: number };
    rows: ImportPreviewRow[];
  } | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const onError = (error: unknown) =>
    toast.showError(
      error instanceof Error ? error.message : "عملیات ناموفق بود.",
    );
  const history = useQuery({
    queryKey: ["import-jobs"],
    queryFn: listImportJobs,
  });
  const running = useQuery({
    queryKey: ["import-job", runningId],
    queryFn: () => getImportJob(runningId!),
    enabled: !!runningId,
    refetchInterval: (query) =>
      query.state.data &&
      ["PENDING", "PROCESSING"].includes(query.state.data.status)
        ? 1500
        : false,
  });

  useEffect(() => {
    if (running.data && ["COMPLETED", "FAILED"].includes(running.data.status))
      queryClient.invalidateQueries({ queryKey: ["import-jobs"] });
  }, [running.data, queryClient]);

  const upload = useMutation({
    mutationFn: uploadImportFile,
    onSuccess: (created) => {
      setJob(created);
      setMapping(
        Object.fromEntries(
          created.columnMapping.map((p) => [p.field, p.header]),
        ),
      );
      setPreview(null);
      setRunningId(null);
    },
    onError,
  });
  const previewMutation = useMutation({
    mutationFn: () =>
      previewImport(
        job!.id,
        Object.entries(mapping)
          .filter(([, h]) => h)
          .map(([field, header]) => ({ field, header })),
      ),
    onSuccess: setPreview,
    onError,
  });
  const run = useMutation({
    mutationFn: () => runImport(job!.id),
    onSuccess: (started) => {
      setRunningId(started.id);
      setJob(null);
      setPreview(null);
      toast.showSuccess("ورود در پس‌زمینه شروع شد.");
    },
    onError,
  });

  const result = running.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="ورود اکسل محصولات"
        description="هر ردیف یک واریانت؛ SKU کلید تطبیق است (موجود به‌روز، تازه ساخته). قبل از تأیید هیچ تغییری اعمال نمی‌شود."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => downloadImportTemplate().catch(onError)}
          >
            <FileDown className="size-4" /> قالب نمونه
          </Button>
        }
      />

      <section className="glass-card flex flex-col gap-3 p-6">
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/10 p-5 text-sm text-slate-300 hover:border-brand-500/40">
          <Upload className="size-5 text-brand-300" />
          {upload.isPending ? "در حال خواندن فایل…" : "انتخاب فایل ‎.xlsx"}
          <input
            type="file"
            accept=".xlsx"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate(file);
              e.target.value = "";
            }}
          />
        </label>
      </section>

      {job && (
        <section className="glass-card flex flex-col gap-4 p-6">
          <h2 className="m-0 text-sm font-bold text-white">
            نگاشت ستون‌ها — {job.originalName} (
            {job.totalRows.toLocaleString("fa-IR")} ردیف)
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {job.fields?.map((f) => (
              <label
                key={f.key}
                className="flex flex-col gap-1 text-xs text-slate-400"
              >
                {f.label}
                {f.key === "sku" && <span className="text-danger">اجباری</span>}
                <Select
                  value={mapping[f.key] ?? ""}
                  onChange={(e) =>
                    setMapping((m) => ({ ...m, [f.key]: e.target.value }))
                  }
                >
                  <option value="">— نادیده —</option>
                  {job.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </label>
            ))}
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={!mapping.sku || previewMutation.isPending}
              onClick={() => previewMutation.mutate()}
            >
              {previewMutation.isPending ? "در حال بررسی…" : "پیش‌نمایش"}
            </Button>
          </div>
        </section>
      )}

      {job && preview && (
        <section className="glass-card flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="m-0 me-auto text-sm font-bold text-white">
              پیش‌نمایش
            </h2>
            <Chip tone="success">
              ایجاد: {preview.summary.create.toLocaleString("fa-IR")}
            </Chip>
            <Chip tone="brand">
              به‌روزرسانی: {preview.summary.update.toLocaleString("fa-IR")}
            </Chip>
            <Chip tone="danger">
              خطا: {preview.summary.error.toLocaleString("fa-IR")}
            </Chip>
          </div>
          <div className="max-h-96 overflow-auto">
            <table className="w-full min-w-[36rem] text-start text-sm">
              <thead>
                <tr className="text-[11px] text-slate-500">
                  <th className="py-2 font-medium">ردیف</th>
                  <th className="py-2 font-medium">SKU</th>
                  <th className="py-2 font-medium">نام</th>
                  <th className="py-2 font-medium">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {preview.rows.map((r) => (
                  <tr key={r.row}>
                    <td className="py-2 text-slate-500">
                      {r.row.toLocaleString("fa-IR")}
                    </td>
                    <td
                      className="py-2 font-mono text-xs text-slate-300"
                      dir="ltr"
                    >
                      {r.sku || "—"}
                    </td>
                    <td className="py-2 text-slate-300">{r.name || "—"}</td>
                    <td className="py-2">
                      <Chip tone={ACTION_CHIP[r.action].tone}>
                        {ACTION_CHIP[r.action].label}
                      </Chip>
                      {r.errors.length > 0 && (
                        <p className="m-0 mt-1 text-[11px] text-danger">
                          {r.errors.join("؛ ")}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-end gap-3">
            {preview.summary.error > 0 && (
              <span className="text-xs text-slate-500">
                ردیف‌های خطادار اجرا نمی‌شوند؛ بقیه اعمال می‌شوند.
              </span>
            )}
            <Button
              size="sm"
              disabled={
                run.isPending ||
                preview.summary.create + preview.summary.update === 0
              }
              onClick={() => run.mutate()}
            >
              تأیید و اجرا
            </Button>
          </div>
        </section>
      )}

      {result && (
        <section className="glass-card flex flex-col gap-3 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="m-0 me-auto text-sm font-bold text-white">
              نتیجه‌ی ورود
            </h2>
            <Chip
              tone={
                result.status === "COMPLETED"
                  ? "success"
                  : result.status === "FAILED"
                    ? "danger"
                    : "warning"
              }
            >
              {STATUS_LABEL[result.status]}
            </Chip>
          </div>
          {result.status === "COMPLETED" && (
            <p className="m-0 text-sm text-slate-300">
              ساخته: {(result.created ?? 0).toLocaleString("fa-IR")} · به‌روز:{" "}
              {(result.updated ?? 0).toLocaleString("fa-IR")} · خطادار:{" "}
              {result.failedRows.toLocaleString("fa-IR")}
            </p>
          )}
          {result.error && (
            <p className="m-0 text-xs text-danger">{result.error}</p>
          )}
          {result.failedRows > 0 && (
            <div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => downloadImportErrors(result.id).catch(onError)}
              >
                <FileSpreadsheet className="size-4" /> اکسل ردیف‌های خطادار
              </Button>
            </div>
          )}
        </section>
      )}

      <section className="glass-card overflow-x-auto p-0">
        <h2 className="m-0 border-b border-white/[0.06] px-6 py-4 text-sm font-bold text-white">
          تاریخچه
        </h2>
        <table className="w-full min-w-[36rem] text-start text-sm">
          <tbody className="divide-y divide-white/[0.04]">
            {history.data?.results.map((j) => (
              <tr key={j.id}>
                <td className="px-6 py-3 text-slate-300">{j.originalName}</td>
                <td className="px-4 py-3 text-slate-500">
                  {formatJalaliDateTime(j.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <Chip
                    tone={
                      j.status === "COMPLETED"
                        ? "success"
                        : j.status === "FAILED"
                          ? "danger"
                          : "neutral"
                    }
                  >
                    {STATUS_LABEL[j.status]}
                  </Chip>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {j.successfulRows.toLocaleString("fa-IR")} موفق ·{" "}
                  {j.failedRows.toLocaleString("fa-IR")} خطا
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
