import { useQuery } from "@tanstack/react-query";
import { getSearchConsoleIndexStatus } from "@/lib/api";
import {
  ReportSection,
  StatGrid,
  ReportLoading,
  ReportError,
} from "@/pages/reports/ReportSection";
import { SearchConsoleNotConnected } from "@/pages/searchConsole/NotConnected";

export function IndexStatusCard() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["search-console-index-status"],
    queryFn: () => getSearchConsoleIndexStatus(),
  });

  return (
    <ReportSection
      title="وضعیت ایندکس"
      description="تعداد صفحات ایندکس‌شده و خطاهای ایندکس در گوگل."
    >
      {isPending ? (
        <ReportLoading />
      ) : isError ? (
        <ReportError onRetry={() => refetch()} />
      ) : !data ? (
        <SearchConsoleNotConnected />
      ) : (
        <>
          <StatGrid
            stats={[
              {
                label: "صفحات ایندکس‌شده",
                value: data.indexedCount.toLocaleString("fa-IR"),
                tone: "success",
              },
              {
                label: "خطاهای ایندکس",
                value: data.errorCount.toLocaleString("fa-IR"),
                tone: data.errorCount > 0 ? "danger" : undefined,
              },
            ]}
          />
          {data.issues.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                    <th className="px-3 py-2 font-medium">صفحه</th>
                    <th className="px-3 py-2 font-medium">علت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {data.issues.map((issue, i) => (
                    <tr key={`${issue.page}-${i}`}>
                      <td
                        className="max-w-xs truncate px-3 py-2 font-semibold text-white"
                        dir="ltr"
                        title={issue.page}
                      >
                        {issue.page}
                      </td>
                      <td className="px-3 py-2 text-danger">{issue.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </ReportSection>
  );
}
