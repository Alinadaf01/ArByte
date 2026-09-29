import type { ReactNode } from "react";

export function DashboardZone({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="glass-card flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-base font-bold text-white">{title}</h2>
          {description && (
            <p className="m-0 mt-1 text-xs text-slate-500">{description}</p>
          )}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function TrendBadge({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  if (previous === 0 && current === 0) return null;
  const diff =
    previous === 0 ? 100 : Math.round(((current - previous) / previous) * 100);
  const isUp = diff >= 0;
  return (
    <span
      className={`text-[11px] font-bold ${isUp ? "text-success" : "text-danger"}`}
    >
      {isUp ? "▲" : "▼"} {Math.abs(diff).toLocaleString("fa-IR")}٪ نسبت به همین
      روز هفته قبل
    </span>
  );
}
