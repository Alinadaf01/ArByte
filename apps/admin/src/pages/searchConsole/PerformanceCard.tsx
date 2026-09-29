import { useQuery } from "@tanstack/react-query";
import { Bar } from "react-chartjs-2";
import { getSearchConsolePerformance } from "@/lib/api";
import { CHART_COLORS, baseChartOptions } from "@/lib/chartTheme";
import { formatJalaliDate, formatPercent } from "@/lib/formatters";
import {
  ReportSection,
  StatGrid,
  ReportLoading,
  ReportError,
} from "@/pages/reports/ReportSection";
import { SearchConsoleNotConnected } from "@/pages/searchConsole/NotConnected";

export function PerformanceCard({ from, to }: { from: string; to: string }) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["search-console-performance", from, to],
    queryFn: () =>
      getSearchConsolePerformance({
        from: from || undefined,
        to: to || undefined,
      }),
  });

  return (
    <ReportSection
      title="عملکرد در جست‌وجوی گوگل"
      description="نمایش، کلیک، و میانگین جایگاه در نتایج جست‌وجو."
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
                label: "نمایش",
                value: data.impressions.toLocaleString("fa-IR"),
              },
              { label: "کلیک", value: data.clicks.toLocaleString("fa-IR") },
              { label: "نرخ کلیک (CTR)", value: formatPercent(data.ctr) },
              {
                label: "میانگین جایگاه",
                value: data.avgPosition.toLocaleString("fa-IR", {
                  maximumFractionDigits: 1,
                }),
              },
            ]}
          />
          {data.series.length === 0 ? (
            <p className="m-0 text-sm text-slate-500">
              داده‌ای در این بازه یافت نشد.
            </p>
          ) : (
            <div className="h-64">
              <Bar
                data={{
                  labels: data.series.map((r) => formatJalaliDate(r.date)),
                  datasets: [
                    {
                      label: "کلیک",
                      data: data.series.map((r) => r.clicks),
                      backgroundColor: CHART_COLORS.brandFill,
                      borderColor: CHART_COLORS.brand,
                      borderWidth: 1.5,
                      borderRadius: 6,
                    },
                  ],
                }}
                options={{
                  ...baseChartOptions,
                  plugins: {
                    ...baseChartOptions.plugins,
                    legend: { display: false },
                  },
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: { color: CHART_COLORS.text },
                    },
                    y: {
                      grid: { color: CHART_COLORS.grid },
                      ticks: { color: CHART_COLORS.text },
                    },
                  },
                }}
              />
            </div>
          )}
        </>
      )}
    </ReportSection>
  );
}
