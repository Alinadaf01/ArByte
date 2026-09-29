import { useState } from "react";
import { JalaliDateInput } from "@/components/ui/JalaliDateInput";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Field";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { Pagination } from "@/components/ui/Pagination";
import { listActivityLog } from "@/lib/api";
import { useQueryFilters } from "@/lib/useQueryFilters";
import { formatJalaliDateTime } from "@/lib/formatters";
import { LoginAttemptsCard } from "@/pages/activityLog/LoginAttemptsCard";

const PAGE_SIZE = 20;

function ChangesCell({
  changes,
}: {
  changes: Record<string, [unknown, unknown]> | null;
}) {
  const [open, setOpen] = useState(false);
  const fields = changes ? Object.keys(changes) : [];
  if (fields.length === 0) return <span className="text-slate-600">—</span>;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-fit text-xs text-brand-300 hover:underline"
      >
        {fields.length.toLocaleString("fa-IR")} فیلد{" "}
        {open ? "(بستن)" : "(نمایش)"}
      </button>
      {open && (
        <div
          className="flex flex-col gap-1 rounded-lg bg-ink-800/60 p-2 text-[11px]"
          dir="ltr"
        >
          {fields.map((field) => {
            const [before, after] = changes![field];
            return (
              <div key={field} className="flex flex-wrap gap-1 text-slate-400">
                <span className="font-semibold text-slate-300">{field}:</span>
                <span className="text-danger/80 line-through">
                  {JSON.stringify(before)}
                </span>
                <span>→</span>
                <span className="text-success-dark">
                  {JSON.stringify(after)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ActivityLogPage() {
  const [filters, setFilters] = useQueryFilters({
    page: "1",
    model: "",
    dateFrom: "",
    dateTo: "",
  });
  const page = Number(filters.page) || 1;

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["activity-log", filters],
    queryFn: () =>
      listActivityLog({
        page,
        pageSize: PAGE_SIZE,
        model: filters.model || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      }),
  });

  const entries = data?.results ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="گزارش فعالیت"
        description="سیاهه خودکار تمام تغییرات ثبت‌شده توسط کارکنان در پنل — چه کسی، چه چیزی، چه زمانی."
      />

      <section className="glass-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-6 py-4">
          <Input
            className="w-auto"
            placeholder="فیلتر بر اساس مدل (مثلاً Order، Product)"
            dir="ltr"
            value={filters.model}
            onChange={(e) => setFilters({ model: e.target.value, page: "1" })}
          />
          <JalaliDateInput
            label="از تاریخ"
            value={filters.dateFrom}
            onChange={(iso) => setFilters({ dateFrom: iso, page: "1" })}
          />
          <span className="text-xs text-slate-500">تا</span>
          <JalaliDateInput
            label="تا تاریخ"
            value={filters.dateTo}
            onChange={(iso) => setFilters({ dateTo: iso, page: "1" })}
          />
        </div>

        {isError ? (
          <ErrorState
            description="دریافت گزارش فعالیت ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && entries.length === 0 ? (
          <EmptyState
            icon={History}
            title="فعالیتی یافت نشد"
            description="هنوز تغییری در پنل ثبت نشده، یا با این فیلترها چیزی پیدا نشد."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-start text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                    <th className="px-6 py-3 font-medium">زمان</th>
                    <th className="px-4 py-3 font-medium">کاربر</th>
                    <th className="px-4 py-3 font-medium">عملیات</th>
                    <th className="px-4 py-3 font-medium">مدل</th>
                    <th className="px-4 py-3 font-medium">شناسه</th>
                    <th className="px-4 py-3 font-medium">تغییرات</th>
                  </tr>
                </thead>
                {isPending ? (
                  <TableSkeleton rows={8} cols={6} />
                ) : (
                  <tbody className="divide-y divide-white/[0.04]">
                    {entries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-6 py-3 text-slate-500">
                          {formatJalaliDateTime(entry.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {entry.user ?? "سیستم"}
                        </td>
                        <td className="px-4 py-3">
                          <code
                            dir="ltr"
                            className="rounded bg-ink-800/60 px-1.5 py-0.5 text-[11px] text-brand-300"
                          >
                            {entry.action}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-slate-400" dir="ltr">
                          {entry.modelName}
                        </td>
                        <td className="px-4 py-3 text-slate-500" dir="ltr">
                          {entry.objectId || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <ChangesCell changes={entry.changes} />
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
      <LoginAttemptsCard />
    </div>
  );
}
