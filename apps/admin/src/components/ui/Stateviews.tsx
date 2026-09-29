import type { ReactNode } from "react";
import { Archive, type LucideIcon } from "lucide-react";

function InfoIcon({ children }: { children: ReactNode }) {
  return (
    <span className="grid size-14 place-items-center rounded-2xl border border-white/[0.08] bg-ink-800/60 text-brand-400">
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Archive,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  /** A linear icon matching what's empty for this list — e.g. Users for an
   * empty user table, Mail for no messages. Defaults to a generic archive. */
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <InfoIcon>
        <Icon className="size-7" strokeWidth={1.6} />
      </InfoIcon>
      <p className="m-0 text-sm font-bold text-white">{title}</p>
      {description && (
        <p className="m-0 max-w-sm text-sm leading-7 text-slate-500">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

export function ErrorState({
  description,
  onRetry,
}: {
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl border border-danger/20 bg-danger/10 text-danger">
        <svg
          className="size-7"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.6"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </span>
      <p className="m-0 text-sm font-bold text-white">مشکلی پیش آمد</p>
      <p className="m-0 max-w-sm text-sm leading-7 text-slate-500">
        {description ?? "دریافت اطلاعات ناموفق بود."}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-2.5 text-xs font-semibold text-slate-300 transition-all duration-300 hover:border-brand-500/30 hover:text-brand-300"
        >
          تلاش دوباره
        </button>
      )}
    </div>
  );
}
