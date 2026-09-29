import type { ReactNode } from "react";

export function ReportSection({
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

export function StatGrid({
  stats,
}: {
  stats: {
    label: string;
    value: string;
    tone?: "success" | "danger" | "warning";
  }[];
}) {
  const toneClass: Record<string, string> = {
    success: "text-success",
    danger: "text-danger",
    warning: "text-warning",
  };
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-white/[0.06] bg-ink-800/40 p-4"
        >
          <p className="m-0 text-xs text-slate-500">{stat.label}</p>
          <p
            className={`m-0 mt-1 text-xl font-extrabold ${stat.tone ? toneClass[stat.tone] : "text-white"}`}
          >
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function ReportLoading() {
  return <div className="h-40 animate-pulse rounded-xl bg-white/[0.03]" />;
}

export function ReportError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <p className="m-0 text-sm text-slate-400">دریافت گزارش ناموفق بود.</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-slate-300 hover:border-brand-500/30 hover:text-brand-300"
      >
        تلاش دوباره
      </button>
    </div>
  );
}
