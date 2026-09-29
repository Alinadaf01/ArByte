import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar } from "react-chartjs-2";
import { Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { getSalesReport, downloadSalesReportExport } from "@/lib/api";
import { CHART_COLORS, baseChartOptions } from "@/lib/chartTheme";
import { formatPrice } from "@/lib/formatters";
import { useToast } from "@/lib/ToastContext";
import {
  ReportSection,
  StatGrid,
  ReportLoading,
  ReportError,
} from "@/pages/reports/ReportSection";
import type { ReportGroupBy } from "@/types/report";

export function SalesReportCard({ from, to }: { from: string; to: string }) {
  const toast = useToast();
  const [groupBy, setGroupBy] = useState<ReportGroupBy>("day");
  const [exporting, setExporting] = useState(false);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["report-sales", from, to, groupBy],
    queryFn: () =>
      getSalesReport({ from: from || undefined, to: to || undefined, groupBy }),
  });

  async function handleExport() {
    setExporting(true);
    try {
      await downloadSalesReportExport({
        from: from || undefined,
        to: to || undefined,
        groupBy,
      });
    } catch (error) {
      toast.showError(
        error instanceof Error ? error.message : "خروجی اکسل ناموفق بود.",
      );
    } finally {
      setExporting(false);
    }
  }

  const totalRevenue =
    data?.series.reduce((sum, row) => sum + row.total, 0) ?? 0;
  const totalOrders =
    data?.series.reduce((sum, row) => sum + row.orderCount, 0) ?? 0;

  return (
    <ReportSection
      title="فروش"
      description="روند فروش در بازه انتخاب‌شده."
      actions={
        <div className="flex items-center gap-2">
          <Select
            className="w-auto"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as ReportGroupBy)}
          >
            <option value="day">روزانه</option>
            <option value="week">هفتگی</option>
            <option value="month">ماهانه</option>
          </Select>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? "در حال آماده‌سازی…" : "خروجی Excel"}
          </Button>
        </div>
      }
    >
      {isPending ? (
        <ReportLoading />
      ) : isError ? (
        <ReportError onRetry={() => refetch()} />
      ) : (
        <>
          <StatGrid
            stats={[
              { label: "درآمد کل", value: formatPrice(totalRevenue) },
              {
                label: "تعداد سفارش",
                value: totalOrders.toLocaleString("fa-IR"),
              },
              {
                label: "میانگین ارزش سفارش",
                value: formatPrice(data!.averageOrderValue),
              },
            ]}
          />
          {data!.series.length === 0 ? (
            <p className="m-0 text-sm text-slate-500">
              داده‌ای در این بازه یافت نشد.
            </p>
          ) : (
            <div className="h-64">
              <Bar
                data={{
                  labels: data!.series.map((r) => r.label),
                  datasets: [
                    {
                      label: "فروش (تومان)",
                      data: data!.series.map((r) => r.total),
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
