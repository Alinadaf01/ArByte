import { Bar } from "react-chartjs-2";
import { DashboardZone, TrendBadge } from "@/pages/dashboard/DashboardZone";
import { CHART_COLORS, baseChartOptions } from "@/lib/chartTheme";
import { formatPrice } from "@/lib/formatters";
import type { DashboardProductRow, Trends } from "@/types/dashboard";

function ProductList({
  title,
  rows,
  by,
}: {
  title: string;
  rows: DashboardProductRow[];
  by: "quantity" | "revenue";
}) {
  return (
    <div className="flex-1">
      <p className="m-0 mb-2 text-xs font-semibold text-slate-300">{title}</p>
      {rows.length === 0 ? (
        <p className="m-0 text-xs text-slate-500">این هفته فروشی ثبت نشده.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {rows.map((row) => (
            <li
              key={row.product.id}
              className="flex items-center justify-between text-xs"
            >
              <span className="truncate text-slate-300">
                {row.product.name}
              </span>
              <span className="font-semibold text-white">
                {by === "quantity"
                  ? `${row.unitsSold.toLocaleString("fa-IR")} عدد`
                  : formatPrice(row.revenue)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TrendsZone({ data }: { data: Trends }) {
  return (
    <DashboardZone
      title="روند"
      description="نمودار فروش ۳۰ روز اخیر، پرفروش‌های هفته، و مقایسه ماهانه."
    >
      <div className="h-56">
        <Bar
          data={{
            labels: data.salesChart30d.map((r) => r.date),
            datasets: [
              {
                label: "فروش روزانه",
                data: data.salesChart30d.map((r) => r.total),
                backgroundColor: CHART_COLORS.brandFill,
                borderColor: CHART_COLORS.brand,
                borderWidth: 1.5,
                borderRadius: 4,
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
              x: { grid: { display: false }, ticks: { display: false } },
              y: {
                grid: { color: CHART_COLORS.grid },
                ticks: { color: CHART_COLORS.text },
              },
            },
          }}
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <ProductList
          title="پرفروش‌های هفته (تعداد)"
          rows={data.topProductsByQuantity}
          by="quantity"
        />
        <ProductList
          title="پرفروش‌های هفته (مبلغ)"
          rows={data.topProductsByRevenue}
          by="revenue"
        />
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-ink-800/40 p-4">
        <p className="m-0 text-xs text-slate-500">
          ماه جاری در برابر ماه قبل (تا همین روز)
        </p>
        <div className="mt-1 flex items-center gap-3">
          <p className="m-0 text-xl font-extrabold text-white">
            {formatPrice(data.thisMonthToDate)}
          </p>
          <TrendBadge
            current={data.thisMonthToDate}
            previous={data.lastMonthToDate}
          />
        </div>
        <p className="m-0 mt-1 text-[11px] text-slate-500">
          ماه قبل تا همین روز: {formatPrice(data.lastMonthToDate)}
        </p>
      </div>
    </DashboardZone>
  );
}
