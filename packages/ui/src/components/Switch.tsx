import { forwardRef } from "react";
import { cn } from "../lib/cn";

export interface SwitchProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: React.ReactNode;
}

/**
 * سوییچ روشن/خاموش — همان الگوی تأییدشده‌ی `apps/admin` (T-100)، حالا در
 * `packages/ui` مشترک. `dir="rtl"` همیشه: حالت خاموش راست می‌ماند، روشن با
 * `-translate-x` (منفی، چون RTL) به چپ می‌رود.
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { className, label, id, ...props },
  ref,
) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "inline-flex cursor-pointer items-center gap-3",
        props.disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      {label ? <span className="text-body text-primary">{label}</span> : null}
      <span className="relative inline-flex h-7 w-12 shrink-0 items-center">
        <input
          ref={ref}
          type="checkbox"
          role="switch"
          id={id}
          className="peer sr-only"
          {...props}
        />
        <span
          aria-hidden="true"
          className="bg-border peer-checked:bg-brand peer-focus-visible:outline-focus-ring absolute inset-0 rounded-pill transition-colors duration-200 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
        />
        <span
          aria-hidden="true"
          className="bg-surface shadow-card absolute end-1 top-1 h-5 w-5 rounded-pill transition-transform duration-200 peer-checked:-translate-x-5"
        />
      </span>
    </label>
  );
});
