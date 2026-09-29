import { DashboardZone } from "@/pages/dashboard/DashboardZone";
import type { SiteVisits } from "@/types/dashboard";

export function SiteVisitsZone({ data }: { data: SiteVisits }) {
  const periods = [
    { label: "امروز", stats: data.today },
    { label: "این ماه", stats: data.thisMonth },
    { label: "کل", stats: data.total },
  ];

  return (
    <DashboardZone
      title="بازدید سایت"
      description="بازدید کل صفحه و بازدید یکتا."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {periods.map((period) => (
          <div
            key={period.label}
            className="rounded-xl border border-white/[0.06] bg-ink-800/40 p-4"
          >
            <p className="m-0 text-xs text-slate-500">{period.label}</p>
            <p className="m-0 mt-1 text-xl font-extrabold text-white">
              {period.stats.pageViews.toLocaleString("fa-IR")}
            </p>
            <p className="m-0 text-[11px] text-slate-500">
              {period.stats.uniqueVisitors.toLocaleString("fa-IR")} بازدید یکتا
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="m-0 mb-2 text-xs font-semibold text-slate-300">
            پربازدیدترین صفحات
          </p>
          {data.topPages.length === 0 ? (
            <p className="m-0 text-xs text-slate-500">داده‌ای یافت نشد.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {data.topPages.map((page) => (
                <li
                  key={page.path}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="truncate text-slate-400" dir="ltr">
                    {page.path}
                  </span>
                  <span className="font-semibold text-white">
                    {page.views.toLocaleString("fa-IR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="m-0 mb-2 text-xs font-semibold text-slate-300">
            منابع ورودی
          </p>
          {data.topReferrers.length === 0 ? (
            <p className="m-0 text-xs text-slate-500">داده‌ای یافت نشد.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {data.topReferrers.map((ref) => (
                <li
                  key={ref.referrer}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="truncate text-slate-400" dir="ltr">
                    {ref.referrer}
                  </span>
                  <span className="font-semibold text-white">
                    {ref.views.toLocaleString("fa-IR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {data.worstViewToPurchase.length > 0 && (
        <div>
          <p className="m-0 mb-2 text-xs font-semibold text-slate-300">
            نسبت بازدید به خرید — کمترین نسبت (احتمال مشکل قیمت یا محتوا)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-slate-500">
                  <th className="px-3 py-2 font-medium">محصول</th>
                  <th className="px-3 py-2 font-medium">بازدید</th>
                  <th className="px-3 py-2 font-medium">خرید</th>
                  <th className="px-3 py-2 font-medium">نسبت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {data.worstViewToPurchase.map((row) => (
                  <tr key={row.product.id}>
                    <td className="px-3 py-2 font-semibold text-white">
                      {row.product.name}
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {row.views.toLocaleString("fa-IR")}
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {row.purchases.toLocaleString("fa-IR")}
                    </td>
                    <td className="px-3 py-2 text-warning">
                      {(row.ratio * 100).toLocaleString("fa-IR", {
                        maximumFractionDigits: 1,
                      })}
                      ٪
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardZone>
  );
}
