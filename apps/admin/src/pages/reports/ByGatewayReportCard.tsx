import { useQuery } from "@tanstack/react-query";
import { Pie } from "react-chartjs-2";
import { CreditCard } from "lucide-react";
import { getByGatewayReport } from "@/lib/api";
import { baseChartOptions } from "@/lib/chartTheme";
import { formatPrice } from "@/lib/formatters";
import {
  ReportSection,
  ReportLoading,
  ReportError,
} from "@/pages/reports/ReportSection";
import { EmptyState } from "@/components/ui/Stateviews";

const PALETTE = ["#8B6BFF", "#2FB66B", "#F4B400", "#E86A6A", "#22D3EE"];

export function ByGatewayReportCard({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["report-by-gateway", from, to],
    queryFn: () =>
      getByGatewayReport({ from: from || undefined, to: to || undefined }),
  });

  const rows = data ?? [];

  return (
    <ReportSection
      title="فروش به تفکیک درگاه پرداخت"
      description="سهم هر درگاه از تراکنش‌های موفق."
    >
      {isPending ? (
        <ReportLoading />
      ) : isError ? (
        <ReportError onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="داده‌ای یافت نشد"
          description="در این بازه تراکنش موفقی ثبت نشده."
        />
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="mx-auto size-56 shrink-0">
            <Pie
              data={{
                labels: rows.map((r) => r.gateway),
                datasets: [
                  {
                    data: rows.map((r) => r.total),
                    backgroundColor: PALETTE,
                    borderWidth: 0,
                  },
                ],
              }}
              options={{
                ...baseChartOptions,
                plugins: {
                  ...baseChartOptions.plugins,
                  tooltip: {
                    ...baseChartOptions.plugins?.tooltip,
                    callbacks: {
                      label: (ctx) =>
                        `${ctx.label}: ${formatPrice(Number(ctx.parsed))}`,
                    },
                  },
                },
              }}
            />
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                  <th className="px-3 py-2 font-medium">درگاه</th>
                  <th className="px-3 py-2 font-medium">مبلغ</th>
                  <th className="px-3 py-2 font-medium">تعداد سفارش</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {rows.map((row) => (
                  <tr key={row.gateway}>
                    <td
                      className="px-3 py-2 font-semibold text-white"
                      dir="ltr"
                    >
                      {row.gateway}
                    </td>
                    <td className="px-3 py-2 text-slate-300">
                      {formatPrice(row.total)}
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {row.orderCount.toLocaleString("fa-IR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ReportSection>
  );
}
