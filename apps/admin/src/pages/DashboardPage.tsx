import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState } from "@/components/ui/Stateviews";
import { getDashboard } from "@/lib/api";
import { OrderRow } from "@/pages/orders/OrderRow";
import { NeedsActionZone } from "@/pages/dashboard/NeedsActionZone";
import { TodayPulseZone } from "@/pages/dashboard/TodayPulseZone";
import { SiteVisitsZone } from "@/pages/dashboard/SiteVisitsZone";
import { TrendsZone } from "@/pages/dashboard/TrendsZone";
import { SinceLastVisitZone } from "@/pages/dashboard/SinceLastVisitZone";
import { SystemHealthZone } from "@/pages/dashboard/SystemHealthZone";
import { DashboardZone } from "@/pages/dashboard/DashboardZone";

export default function DashboardPage() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="داشبورد"
        description="الان چه چیزی منتظر شماست، و اوضاع چطور است."
      />

      {isPending ? (
        <div className="flex flex-col gap-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl bg-white/[0.03]"
            />
          ))}
        </div>
      ) : isError || !data ? (
        <div className="glass-card p-0">
          <ErrorState
            description="دریافت داشبورد ناموفق بود."
            onRetry={() => refetch()}
          />
        </div>
      ) : (
        <>
          {/* ناحیه ۱ */}
          <NeedsActionZone data={data.needsAction} />
          {/* ناحیه ۴ — روی موبایل بلافاصله بعد از «نیازمند اقدام» می‌آید */}
          <SinceLastVisitZone data={data.sinceLastVisit} />
          {/* ناحیه ۲ */}
          <TodayPulseZone data={data.today} />
          {/* ناحیه ۲.۵ */}
          <SiteVisitsZone data={data.siteVisits} />
          {/* ناحیه ۳ */}
          <TrendsZone data={data.trends} />
          {/* ناحیه ۵ */}
          <SystemHealthZone data={data.systemHealth} />

          <DashboardZone title="سفارش‌های اخیر">
            {data.recentOrders.length === 0 ? (
              <p className="m-0 text-sm text-slate-500">
                هنوز سفارشی ثبت نشده.
              </p>
            ) : (
              <div className="-mx-6 overflow-x-auto">
                <table className="w-full min-w-[42rem] text-start text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                      <th className="px-6 py-3 font-medium">شماره</th>
                      <th className="px-4 py-3 font-medium">مشتری</th>
                      <th className="px-4 py-3 font-medium">تاریخ</th>
                      <th className="px-4 py-3 font-medium">مبلغ</th>
                      <th className="px-4 py-3 font-medium">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {data.recentOrders.map((order) => (
                      <OrderRow key={order.id} order={order} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DashboardZone>
        </>
      )}
    </div>
  );
}
