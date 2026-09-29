import { Link } from "react-router-dom";
import { DashboardZone } from "@/pages/dashboard/DashboardZone";
import { Chip } from "@/components/ui/Chip";
import { formatJalaliDateTime } from "@/lib/formatters";
import type { SystemHealth } from "@/types/dashboard";

export function SystemHealthZone({ data }: { data: SystemHealth }) {
  return (
    <DashboardZone
      title="سلامت سیستم"
      description="خرابی‌های خاموش معمولاً همین‌جا دیده می‌شوند."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div
          className={`rounded-xl border p-4 ${
            data.kavenegarThresholdBreached
              ? "border-danger/30 bg-danger/10"
              : "border-white/[0.06] bg-ink-800/40"
          }`}
        >
          <p className="m-0 text-xs text-slate-500">
            اعتبار باقی‌مانده کاوه‌نگار
          </p>
          <p
            className={`m-0 mt-1 text-xl font-extrabold ${data.kavenegarThresholdBreached ? "text-danger" : "text-white"}`}
          >
            {data.kavenegarCredit === null
              ? "نامشخص"
              : data.kavenegarCredit.toLocaleString("fa-IR")}
          </p>
          {data.kavenegarThresholdBreached && (
            <p className="m-0 mt-1 text-[11px] font-semibold text-danger">
              ⚠️ اعتبار کم است — احتمال قطع ارسال کد ورود کاربران.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-ink-800/40 p-4">
          <p className="m-0 text-xs text-slate-500">خطای پرداخت ۲۴ ساعت اخیر</p>
          <p
            className={`m-0 mt-1 text-xl font-extrabold ${data.paymentErrors24h > 0 ? "text-warning" : "text-white"}`}
          >
            {data.paymentErrors24h.toLocaleString("fa-IR")}
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-ink-800/40 p-4 sm:col-span-2">
          <p className="m-0 mb-2 text-xs text-slate-500">
            وضعیت درگاه‌های پرداخت
          </p>
          {data.gateways.length === 0 ? (
            <p className="m-0 text-xs text-slate-500">هیچ درگاهی تنظیم نشده.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.gateways.map((gw) => (
                <Chip
                  key={gw.service}
                  tone={
                    gw.isActive && gw.hasValidCredentials ? "success" : "danger"
                  }
                  dot
                >
                  {gw.label}
                  {!gw.hasValidCredentials && " — بدون کلید معتبر"}
                  {gw.hasValidCredentials && !gw.isActive && " — غیرفعال"}
                </Chip>
              ))}
            </div>
          )}
        </div>

        <Link
          to="/orders?status=paid"
          className="rounded-xl border border-white/[0.06] bg-ink-800/40 p-4 transition-colors hover:border-brand-500/30"
        >
          <p className="m-0 text-xs text-slate-500">
            پرداخت‌شده و بیش از ۳ روز ارسال‌نشده
          </p>
          <p
            className={`m-0 mt-1 text-xl font-extrabold ${data.paidNotShippedOverThreshold > 0 ? "text-warning" : "text-white"}`}
          >
            {data.paidNotShippedOverThreshold.toLocaleString("fa-IR")}
          </p>
        </Link>

        <div className="rounded-xl border border-white/[0.06] bg-ink-800/40 p-4">
          <p className="m-0 text-xs text-slate-500">
            آخرین خواندن سایت‌مپ گوگل
          </p>
          <p className="m-0 mt-1 text-sm font-bold text-white">
            {data.sitemapLastReadAt
              ? formatJalaliDateTime(data.sitemapLastReadAt)
              : "هنوز خوانده نشده"}
          </p>
          <p className="m-0 text-[11px] text-slate-500">
            {data.sitemapDiscoveredUrls.toLocaleString("fa-IR")} آدرس کشف‌شده
          </p>
        </div>
      </div>

      {data.stockDiscrepancies.length > 0 && (
        <div>
          <p className="m-0 mb-2 text-xs font-semibold text-danger">
            مغایرت موجودی — مانده کاردکس با موجودی محصول نمی‌خواند
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-slate-500">
                  <th className="px-3 py-2 font-medium">محصول</th>
                  <th className="px-3 py-2 font-medium">موجودی فعلی</th>
                  <th className="px-3 py-2 font-medium">مانده کاردکس</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {data.stockDiscrepancies.map((row) => (
                  <tr key={row.product.id}>
                    <td className="px-3 py-2 font-semibold text-white">
                      {row.product.name}
                    </td>
                    <td className="px-3 py-2 text-slate-300">
                      {row.quantity.toLocaleString("fa-IR")}
                    </td>
                    <td className="px-3 py-2 text-danger">
                      {row.ledgerBalance.toLocaleString("fa-IR")}
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
