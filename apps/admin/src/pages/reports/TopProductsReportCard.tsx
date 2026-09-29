import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar } from "react-chartjs-2";
import { BarChart3 } from "lucide-react";
import { Select } from "@/components/ui/Field";
import { getTopProductsReport } from "@/lib/api";
import { CHART_COLORS, baseChartOptions } from "@/lib/chartTheme";
import { formatPrice } from "@/lib/formatters";
import {
  ReportSection,
  ReportLoading,
  ReportError,
} from "@/pages/reports/ReportSection";
import { EmptyState } from "@/components/ui/Stateviews";
import type { TopProductsBy } from "@/types/report";

export function TopProductsReportCard({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  const [by, setBy] = useState<TopProductsBy>("quantity");

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["report-top-products", from, to, by],
    queryFn: () =>
      getTopProductsReport({
        from: from || undefined,
        to: to || undefined,
        by,
      }),
  });

  const top = (data ?? []).slice(0, 10);

  return (
    <ReportSection
      title="پرفروش‌ترین محصولات"
      description="بر اساس تعداد فروخته‌شده یا درآمد."
      actions={
        <Select
          className="w-auto"
          value={by}
          onChange={(e) => setBy(e.target.value as TopProductsBy)}
        >
          <option value="quantity">بر اساس تعداد</option>
          <option value="revenue">بر اساس درآمد</option>
        </Select>
      }
    >
      {isPending ? (
        <ReportLoading />
      ) : isError ? (
        <ReportError onRetry={() => refetch()} />
      ) : top.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="داده‌ای یافت نشد"
          description="در این بازه محصولی فروخته نشده."
        />
      ) : (
        <div className="h-72">
          <Bar
            data={{
              labels: top.map((r) => r.product.name),
              datasets: [
                {
                  label:
                    by === "quantity" ? "تعداد فروخته‌شده" : "درآمد (تومان)",
                  data: top.map((r) =>
                    by === "quantity" ? r.unitsSold : r.revenue,
                  ),
                  backgroundColor: CHART_COLORS.successFill,
                  borderColor: CHART_COLORS.success,
                  borderWidth: 1.5,
                  borderRadius: 6,
                },
              ],
            }}
            options={{
              ...baseChartOptions,
              indexAxis: "y" as const,
              plugins: {
                ...baseChartOptions.plugins,
                legend: { display: false },
                tooltip: {
                  ...baseChartOptions.plugins?.tooltip,
                  callbacks: {
                    label: (ctx) =>
                      by === "revenue"
                        ? formatPrice(Number(ctx.parsed.x))
                        : String(ctx.parsed.x),
                  },
                },
              },
              scales: {
                x: {
                  grid: { color: CHART_COLORS.grid },
                  ticks: { color: CHART_COLORS.text },
                },
                y: {
                  grid: { display: false },
                  ticks: { color: CHART_COLORS.text },
                },
              },
            }}
          />
        </div>
      )}
    </ReportSection>
  );
}
