import { useQuery } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Field";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { Pagination } from "@/components/ui/Pagination";
import { MessageRow } from "@/pages/messages/MessageRow";
import { listMessages } from "@/lib/api";
import { useQueryFilters } from "@/lib/useQueryFilters";

const PAGE_SIZE = 12;

export default function MessagesPage() {
  const [filters, setFilters] = useQueryFilters({ page: "1", isRead: "" });
  const page = Number(filters.page) || 1;

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["messages", filters],
    queryFn: () =>
      listMessages({
        page,
        pageSize: PAGE_SIZE,
        isRead: filters.isRead || undefined,
      }),
  });

  const messages = data?.results ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="پیام‌ها"
        description="پیام‌های فرم تماس با تغییر وضعیت خوانده/نخوانده و یادداشت ادمین."
      />

      <section className="glass-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-6 py-4">
          <Select
            className="w-auto"
            value={filters.isRead}
            onChange={(e) => setFilters({ isRead: e.target.value, page: "1" })}
          >
            <option value="">همه پیام‌ها</option>
            <option value="false">خوانده‌نشده</option>
            <option value="true">خوانده‌شده</option>
          </Select>
        </div>

        {isError ? (
          <ErrorState
            description="دریافت پیام‌ها ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && messages.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="پیامی یافت نشد"
            description="هنوز پیامی از فرم تماس دریافت نشده."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-start text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                    <th className="px-6 py-3 font-medium">فرستنده</th>
                    <th className="px-4 py-3 font-medium">موضوع</th>
                    <th className="px-4 py-3 font-medium">تاریخ</th>
                    <th className="px-4 py-3 font-medium">وضعیت</th>
                  </tr>
                </thead>
                {isPending ? (
                  <TableSkeleton rows={6} cols={4} />
                ) : (
                  <tbody className="divide-y divide-white/[0.04]">
                    {messages.map((message) => (
                      <MessageRow key={message.id} message={message} />
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
    </div>
  );
}
