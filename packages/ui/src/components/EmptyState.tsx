import { cn } from "../lib/cn";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  /** عنوان و توضیح از props/لایه‌ی متن می‌آیند (قانون ۲) — مثلاً «سبد خرید شما خالی است.» */
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * حالت خالی — سبد خالی (`Cart.dc.html`)، بدون نتیجه‌ی فیلتر (`Products.dc.html`)،
 * سفارش پیدا نشد (`TrackOrder.dc.html`). ورود با `animate-rise` (توکن
 * «Result/empty panels appearing»).
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "animate-rise flex flex-col items-center gap-3 px-4 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="bg-surface-muted text-secondary flex h-14 w-14 items-center justify-center rounded-full">
          {icon}
        </div>
      ) : null}
      <div className="flex flex-col gap-1">
        <p className="text-card-title text-primary font-heading">{title}</p>
        {description ? (
          <p className="text-body text-secondary">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
