import { useQuery } from "@tanstack/react-query";
import { getSearchConsoleQueries } from "@/lib/api";
import { formatPercent } from "@/lib/formatters";
import {
  ReportSection,
  ReportLoading,
  ReportError,
} from "@/pages/reports/ReportSection";
import { SearchConsoleNotConnected } from "@/pages/searchConsole/NotConnected";

export function QueriesCard({ from, to }: { from: string; to: string }) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["search-console-queries", from, to],
    queryFn: () =>
      getSearchConsoleQueries({ from: from || undefined, to: to || undefined }),
  });

  return (
    <ReportSection
      title="پرسجوهای برتر"
      description="عبارت‌هایی که کاربران با آن‌ها به سایت رسیده‌اند."
    >
      {isPending ? (
        <ReportLoading />
      ) : isError ? (
        <ReportError onRetry={() => refetch()} />
      ) : !data ? (
        <SearchConsoleNotConnected />
      ) : data.length === 0 ? (
        <p className="m-0 text-sm text-slate-500">
          داده‌ای در این بازه یافت نشد.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                <th className="px-3 py-2 font-medium">عبارت جستجو</th>
                <th className="px-3 py-2 font-medium">نمایش</th>
                <th className="px-3 py-2 font-medium">کلیک</th>
                <th className="px-3 py-2 font-medium">CTR</th>
                <th className="px-3 py-2 font-medium">جایگاه</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {data.map((row) => (
                <tr key={row.query}>
                  <td className="px-3 py-2 font-semibold text-white">
                    {row.query}
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {row.impressions.toLocaleString("fa-IR")}
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {row.clicks.toLocaleString("fa-IR")}
                  </td>
                  <td className="px-3 py-2 text-slate-500">
                    {formatPercent(row.ctr)}
                  </td>
                  <td className="px-3 py-2 text-slate-500">
                    {row.position.toLocaleString("fa-IR", {
                      maximumFractionDigits: 1,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportSection>
  );
}
