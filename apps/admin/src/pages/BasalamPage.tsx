import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/Stateviews";
import { downloadBasalamProductsXlsx, getBasalamStatus } from "@/lib/api";
import { useToast } from "@/lib/ToastContext";

/**
 * بستر حضور در باسلام (Salam API — developers.basalam.com). فعلاً فقط
 * خروجی محصولات (اکسل/JSON) با شکل مناسب باسلام؛ ارسال زنده (ایجاد خودکار
 * محصول در غرفه) نیاز به اعتبارنامه‌ی واقعی (clientId/clientSecret/vendorId
 * از پنل توسعه‌دهندگان باسلام) و آپلود جدای عکس دارد — بعد از این‌که
 * اعتبارنامه آمد، همین صفحه گسترش پیدا می‌کند.
 */
export default function BasalamPage() {
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);
  const status = useQuery({
    queryKey: ["basalam-status"],
    queryFn: getBasalamStatus,
  });

  async function download() {
    setDownloading(true);
    try {
      await downloadBasalamProductsXlsx();
    } catch (error) {
      toast.showError(
        error instanceof Error ? error.message : "خروجی اکسل ناموفق بود.",
      );
    } finally {
      setDownloading(false);
    }
  }

  if (status.isPending) return <Skeleton className="h-64 w-full" />;
  if (status.isError)
    return (
      <ErrorState
        description={status.error.message}
        onRetry={() => status.refetch()}
      />
    );
  const s = status.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="باسلام"
        description="خروجی محصولات متناسب با Salam API باسلام — برای حضور در باسلام."
      />

      <section className="glass-card flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={s.enabled ? "success" : "neutral"}>
            {s.enabled ? "متصل" : "اعتبارنامه ثبت نشده"}
          </Chip>
          <span className="text-xs text-slate-400">
            {s.itemCount.toLocaleString("fa-IR")} محصول قابل‌خروجی
          </span>
        </div>
        {!s.enabled && (
          <p className="m-0 text-sm text-slate-300">
            برای اتصال زنده، از پنل توسعه‌دهندگان باسلام
            (developers.basalam.com) یک اپ بساز و clientId/clientSecret/vendorId
            را در{" "}
            <Link to="/settings" className="text-brand-300 underline">
              تنظیمات → کلیدهای API
            </Link>{" "}
            با سرویس «باسلام» ثبت و فعال کن. تا آن‌موقع همین‌جا می‌توانی خروجی
            اکسل محصولات را بگیری و خودت در پنل غرفه‌داری باسلام ثبت کنی.
          </p>
        )}
      </section>

      <section className="glass-card flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 text-base font-bold text-white">خروجی محصولات</h2>
          <Button size="sm" disabled={downloading} onClick={download}>
            <Download className="size-4" strokeWidth={1.8} />
            {downloading ? "در حال آماده‌سازی…" : "دانلود اکسل"}
          </Button>
        </div>
        <p className="m-0 text-xs text-slate-400">
          ستون‌ها دقیقاً مطابق فیلدهای مستندشده‌ی POST /v1/vendors/
          {"{vendor_id}"}/products هستند: sku، name، brief، description،
          primary_price (تومان)، stock، brand، image_url، is_available.
        </p>
      </section>
    </div>
  );
}
