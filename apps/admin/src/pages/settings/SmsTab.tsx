import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Input, Select, Switch } from "@/components/ui/Field";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { listSmsLogs, listSmsTemplates, updateSmsTemplate } from "@/lib/api";
import { formatJalaliDateTime } from "@/lib/formatters";
import { useToast } from "@/lib/ToastContext";
import type { SmsTemplate } from "@/types/settings";
import { MessageSquare } from "lucide-react";

const LOG_STATUS: Record<
  string,
  { label: string; tone: "success" | "danger" | "warning" }
> = {
  sent: { label: "ارسال‌شده", tone: "success" },
  failed: { label: "ناموفق", tone: "danger" },
  queued: { label: "در صف", tone: "warning" },
};
const PAGE_SIZE = 20;

function TemplateRow({ template }: { template: SmsTemplate }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState(template.kavenegarTemplateName);
  const mutation = useMutation({
    mutationFn: (
      data: Partial<Pick<SmsTemplate, "isActive" | "kavenegarTemplateName">>,
    ) => updateSmsTemplate(template.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-templates"] });
      toast.showSuccess("قالب ذخیره شد.");
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "ذخیره ناموفق بود.",
      ),
  });

  return (
    <tr>
      <td className="px-6 py-3">
        <p className="m-0 font-semibold text-white">{template.title}</p>
        <p className="m-0 font-mono text-[11px] text-slate-500" dir="ltr">
          {template.key}
        </p>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Input
            className="w-40"
            dir="ltr"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="نام الگوی کاوه‌نگار"
          />
          {name !== template.kavenegarTemplateName && (
            <Button
              size="sm"
              disabled={mutation.isPending}
              onClick={() =>
                mutation.mutate({ kavenegarTemplateName: name.trim() })
              }
            >
              ذخیره
            </Button>
          )}
        </div>
      </td>
      <td className="px-4 py-3 font-mono text-[11px] text-slate-400" dir="ltr">
        {Object.entries(template.kavenegarTokenMap ?? {})
          .map(([token, field]) => `${token} ← ${field}`)
          .join("، ") || "—"}
      </td>
      <td className="px-4 py-3">
        <Switch
          checked={template.isActive}
          onChange={(v) => mutation.mutate({ isActive: v })}
          label={template.isActive ? "فعال" : "غیرفعال"}
        />
      </td>
    </tr>
  );
}

export function SmsTab() {
  const templates = useQuery({
    queryKey: ["sms-templates"],
    queryFn: listSmsTemplates,
  });
  const [filters, setFilters] = useState({
    page: 1,
    status: "",
    phone: "",
    template: "",
  });
  const logs = useQuery({
    queryKey: ["sms-logs", filters],
    queryFn: () =>
      listSmsLogs({
        page: filters.page,
        pageSize: PAGE_SIZE,
        status: filters.status || undefined,
        phone: filters.phone || undefined,
        template: filters.template || undefined,
      }),
  });

  return (
    <div className="flex flex-col gap-6">
      <section className="glass-card overflow-hidden p-0">
        <h2 className="m-0 border-b border-white/[0.06] px-6 py-4 text-sm font-bold text-white">
          قالب‌های پیامک (الگوهای کاوه‌نگار)
        </h2>
        {templates.isError ? (
          <ErrorState
            description="دریافت قالب‌ها ناموفق بود."
            onRetry={() => templates.refetch()}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-start text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                  <th className="px-6 py-3 font-medium">قالب</th>
                  <th className="px-4 py-3 font-medium">
                    نام الگو در کاوه‌نگار
                  </th>
                  <th className="px-4 py-3 font-medium">نگاشت توکن</th>
                  <th className="px-4 py-3 font-medium">وضعیت</th>
                </tr>
              </thead>
              {templates.isPending ? (
                <TableSkeleton rows={4} cols={4} />
              ) : (
                <tbody className="divide-y divide-white/[0.04]">
                  {(templates.data ?? [])
                    .filter((t) => t.kavenegarTemplateName || t.isActive)
                    .map((template) => (
                      <TemplateRow key={template.id} template={template} />
                    ))}
                </tbody>
              )}
            </table>
          </div>
        )}
      </section>

      <section className="glass-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-6 py-4">
          <h2 className="m-0 me-auto text-sm font-bold text-white">
            گزارش ارسال پیامک
          </h2>
          <Input
            className="w-40"
            dir="ltr"
            placeholder="موبایل…"
            onBlur={(e) =>
              setFilters((f) => ({
                ...f,
                phone: e.target.value.trim(),
                page: 1,
              }))
            }
          />
          <Select
            className="w-auto"
            value={filters.template}
            onChange={(e) =>
              setFilters((f) => ({ ...f, template: e.target.value, page: 1 }))
            }
          >
            <option value="">همه‌ی قالب‌ها</option>
            {(templates.data ?? []).map((t) => (
              <option key={t.key} value={t.key}>
                {t.title}
              </option>
            ))}
          </Select>
          <Select
            className="w-auto"
            value={filters.status}
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))
            }
          >
            <option value="">همه‌ی وضعیت‌ها</option>
            {Object.entries(LOG_STATUS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        {logs.isError ? (
          <ErrorState
            description="دریافت گزارش ناموفق بود."
            onRetry={() => logs.refetch()}
          />
        ) : !logs.isPending && (logs.data?.results.length ?? 0) === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="پیامکی یافت نشد"
            description="با فیلترهای فعلی پیامکی ثبت نشده است."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-start text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                    <th className="px-6 py-3 font-medium">زمان</th>
                    <th className="px-4 py-3 font-medium">موبایل</th>
                    <th className="px-4 py-3 font-medium">قالب</th>
                    <th className="px-4 py-3 font-medium">وضعیت</th>
                  </tr>
                </thead>
                {logs.isPending ? (
                  <TableSkeleton rows={6} cols={4} />
                ) : (
                  <tbody className="divide-y divide-white/[0.04]">
                    {logs.data!.results.map((log) => (
                      <tr key={log.id}>
                        <td className="px-6 py-3 text-slate-400">
                          {formatJalaliDateTime(log.createdAt)}
                        </td>
                        <td
                          className="px-4 py-3 font-mono text-xs text-slate-300"
                          dir="ltr"
                        >
                          {log.phone}
                        </td>
                        <td
                          className="px-4 py-3 font-mono text-[11px] text-slate-400"
                          dir="ltr"
                        >
                          {log.kavenegarTemplateName || log.templateKey || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Chip
                            tone={LOG_STATUS[log.status]?.tone ?? "neutral"}
                          >
                            {LOG_STATUS[log.status]?.label ?? log.status}
                          </Chip>
                          {log.error && (
                            <p
                              className="m-0 mt-1 max-w-xs truncate text-[11px] text-danger"
                              title={log.error}
                            >
                              {log.error}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>
            {logs.data && (
              <Pagination
                page={filters.page}
                pageSize={PAGE_SIZE}
                count={logs.data.count}
                onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}
