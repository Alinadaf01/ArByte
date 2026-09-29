import { DashboardZone, TrendBadge } from "@/pages/dashboard/DashboardZone";
import { formatPrice } from "@/lib/formatters";
import type { TodayPulse } from "@/types/dashboard";

export function TodayPulseZone({ data }: { data: TodayPulse }) {
  const cards = [
    {
      label: "فروش امروز",
      value: formatPrice(data.sales),
      current: data.sales,
      previous: data.salesLastWeekSameDay,
    },
    {
      label: "تعداد سفارش امروز",
      value: data.orders.toLocaleString("fa-IR"),
      current: data.orders,
      previous: data.ordersLastWeekSameDay,
    },
    {
      label: "میانگین ارزش سفارش",
      value: formatPrice(data.averageOrderValue),
      current: data.averageOrderValue,
      previous: data.averageOrderValueLastWeekSameDay,
    },
    {
      label: "نرخ تبدیل",
      value: `${(data.conversionRate * 100).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`,
      current: data.conversionRate,
      previous: data.conversionRateLastWeekSameDay,
    },
  ];

  return (
    <DashboardZone
      title="نبض امروز"
      description="مقایسه با همین روز هفته گذشته."
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-white/[0.06] bg-ink-800/40 p-4"
          >
            <p className="m-0 text-xs text-slate-500">{card.label}</p>
            <p className="m-0 mt-1 text-xl font-extrabold text-white">
              {card.value}
            </p>
            <div className="mt-1">
              <TrendBadge current={card.current} previous={card.previous} />
            </div>
          </div>
        ))}
      </div>
    </DashboardZone>
  );
}
