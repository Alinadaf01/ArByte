import { toPersianDigits } from "@arbyte/contracts";

export const ORDER_TIMELINE_STEPS = [
  "registered",
  "paid",
  "processing",
  "shipped",
  "delivered",
] as const;
export type OrderTimelineStepKey = (typeof ORDER_TIMELINE_STEPS)[number];

/** E-05 §۱/۲ — نگاشت مشترک enum دیتابیس به شماره‌ی گام (هم صفحه‌ی سفارش
 * مالک، هم پیگیری مهمان). `READY_TO_SHIP` گام جدا ندارد، هنوز «آماده‌سازی» است. */
export const ORDER_STATUS_TO_STEP: Partial<Record<string, number>> = {
  PENDING: 0,
  AWAITING_PAYMENT: 0,
  PAYMENT_REVIEW: 0,
  PAID: 1,
  PROCESSING: 2,
  READY_TO_SHIP: 2,
  SHIPPED: 3,
  DELIVERED: 4,
};

interface OrderTimelineProps {
  currentStep: number;
  labels: Record<OrderTimelineStepKey, string>;
  /** E-05 §۲ — پیگیری مهمان: گام فعلی می‌تپد (طراحی `arbNow`). */
  pulseCurrent?: boolean;
}

export function OrderTimeline({
  currentStep,
  labels,
  pulseCurrent,
}: OrderTimelineProps) {
  return (
    <div className="flex flex-col gap-1">
      {ORDER_TIMELINE_STEPS.map((step, i) => {
        const isDone = i < currentStep;
        const isNow = i === currentStep;
        const isLast = i === ORDER_TIMELINE_STEPS.length - 1;
        return (
          <div
            key={step}
            className="grid grid-cols-[auto_minmax(0,1fr)] gap-3.5"
          >
            <div className="flex flex-col items-center">
              <span
                className={`flex h-6.5 w-6.5 flex-none items-center justify-center rounded-full border-[1.5px] text-micro font-bold ${
                  isDone
                    ? "bg-brand border-brand text-on-dark"
                    : isNow
                      ? "border-brand text-brand-active bg-paper"
                      : "border-border-input text-secondary-2 bg-paper"
                } ${isNow && pulseCurrent ? "animate-pop" : ""}`}
              >
                {isDone ? "✓" : toPersianDigits(i + 1)}
              </span>
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className={`w-[1.5px] flex-1 ${isDone ? "bg-brand" : "bg-border-divider"}`}
                />
              ) : null}
            </div>
            <div
              className={`flex flex-col gap-0.5 ${isLast ? "pb-0" : "pb-5"}`}
            >
              <span
                className={`text-caption font-semibold ${isDone || isNow ? "text-primary" : "text-secondary-2"}`}
              >
                {labels[step]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
