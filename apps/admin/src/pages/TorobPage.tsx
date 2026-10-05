import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/Stateviews";
import { getTorobStatus, validateTorobFeed } from "@/lib/api";
import { formatJalaliDateTime } from "@/lib/formatters";
import { useToast } from "@/lib/ToastContext";

/**
 * AUDIT-6 — پنل «ترب» (Torob API v3). کلید عمومی ترب و روشن/خاموش اتصال
 * در «تنظیمات → کلیدهای API → ترب» است؛ این صفحه فقط وضعیت و اعتبارسنجی.
 */
export default function TorobPage() {
  const toast = useToast();
  const status = useQuery({
    queryKey: ["torob-status"],
    queryFn: getTorobStatus,
  });
  const validate = useMutation({
    mutationFn: validateTorobFeed,
    onError: (e: unknown) =>
      toast.showError(
        e instanceof Error ? e.message : "اعتبارسنجی ناموفق بود.",
      ),
  });

  if (status.isPending) return <Skeleton className="h-64 w-full" />;
  if (status.isError)
    return (
      <ErrorState
        description={status.error.message}
        onRetry={() => status.refetch()}
      />
    );
  const s = status.data;
  const ready = s.enabled && s.keyConfigured;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="ترب"
        description="اتصال Torob API v3 — ترب محصولات را مستقیم از سرور می‌خواند (هر واریانت یک آیتم، قیمت و موجودی زنده)."
      />

      <section className="glass-card flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={ready ? "success" : "danger"}>
            {ready ? "فعال" : s.enabled ? "کلید عمومی ثبت نشده" : "غیرفعال"}
          </Chip>
          {s.keyFingerprint && (
            <span className="text-xs text-slate-400" dir="ltr">
              key {s.keyFingerprint}
            </span>
          )}
        </div>
        {s.keyError && <p className="m-0 text-sm text-danger">{s.keyError}</p>}
        {!ready && (
          <p className="m-0 text-sm text-slate-300">
            کلید عمومی ترب را از پنل ترب (راهنمای توکن) در{" "}
            <Link to="/settings" className="text-brand-300 underline">
              تنظیمات → کلیدهای API
            </Link>{" "}
            با سرویس «ترب» و کلید <code dir="ltr">publicKey</code> ثبت و فعال
            کنید.
          </p>
        )}
        <div className="flex flex-col gap-1 text-sm">
          <span className="text-slate-400">
            آدرسی که در پنل ترب ثبت می‌شود:
          </span>
          <code dir="ltr" className="select-all break-all text-white">
            {s.endpointUrl}
          </code>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="آیتم‌های فعال (واریانت)" value={s.itemCount} />
        <Stat
          label="آخرین دریافت موفق ترب"
          value={
            s.lastFetchAt ? formatJalaliDateTime(s.lastFetchAt) : "هنوز نه"
          }
          hint={s.lastFetchAt ? `${s.lastFetchItems} آیتم` : undefined}
        />
        <Stat label="درخواست‌ها (۲۴ ساعت)" value={s.last24h.requests} />
        <Stat
          label="خطا / آیتم ردشده (۲۴ ساعت)"
          value={`${s.last24h.errors} / ${s.last24h.invalidItems}`}
        />
      </section>

      <section className="glass-card flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 text-base font-bold text-white">اعتبارسنجی فید</h2>
          <Button
            size="sm"
            disabled={validate.isPending}
            onClick={() => validate.mutate()}
          >
            {validate.isPending ? "در حال بررسی…" : "Validate feed"}
          </Button>
        </div>
        <p className="m-0 text-xs text-slate-400">
          همه‌ی آیتم‌ها را با قالب مستند ترب می‌سنجد؛ چیزی برای ترب فرستاده
          نمی‌شود.
        </p>
        {validate.data && (
          <div className="flex flex-col gap-2 text-sm">
            <p className="m-0 text-white">
              {validate.data.checked} آیتم بررسی شد —{" "}
              {validate.data.invalid === 0
                ? "همه معتبرند."
                : `${validate.data.invalid} آیتم نامعتبر (در پاسخ ترب کنار گذاشته می‌شوند).`}
            </p>
            {validate.data.errors.map((e) => (
              <p
                key={e.pageUnique}
                className="m-0 text-xs text-danger"
                dir="ltr"
              >
                {e.pageUnique}: {e.problems.join(" · ")}
              </p>
            ))}
            {validate.data.withoutImage.length > 0 && (
              <p className="m-0 text-xs text-warning">
                بدون تصویر ({validate.data.withoutImage.length}):{" "}
                <span dir="ltr">{validate.data.withoutImage.join(", ")}</span>
              </p>
            )}
          </div>
        )}
      </section>

      <section className="glass-card flex flex-col gap-2">
        <h2 className="m-0 text-base font-bold text-white">آخرین خطاها</h2>
        {s.recentErrors.length === 0 ? (
          <p className="m-0 text-sm text-slate-400">خطایی ثبت نشده است.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {s.recentErrors.map((e) => (
              <li key={`${e.at}-${e.error}`} className="text-xs text-slate-300">
                <span className="text-slate-500">
                  {formatJalaliDateTime(e.at)}
                </span>{" "}
                · {e.status} · <span dir="ltr">{e.error}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="glass-card flex flex-col gap-1">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-lg font-bold text-white">{value}</span>
      {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
    </div>
  );
}
