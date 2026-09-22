import { forwardRef } from "react";
import { Check } from "lucide-react";
import { cn } from "../lib/cn";

export interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: React.ReactNode;
}

/**
 * روی `<input type="checkbox">` واقعی ساخته شده — سمانتیک/کیبورد (Space)
 * رایگان است. ورودی با `sr-only` بصری مخفی می‌شود ولی همچنان قابل فوکوس
 * است؛ چون حلقه‌ی فوکوس پایه (base layer) روی خودِ ورودیِ مخفی دیده
 * نمی‌شود، حلقه با `peer-focus-visible` روی جعبه‌ی بصری تکرار می‌شود.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ className, label, id, ...props }, ref) {
    return (
      <label
        htmlFor={id}
        className={cn(
          "inline-flex cursor-pointer items-center gap-2",
          props.disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            className="peer sr-only"
            {...props}
          />
          <span
            aria-hidden="true"
            className={cn(
              "border-border-input bg-surface pointer-events-none absolute inset-0 rounded-chip border transition-colors duration-200",
              "peer-checked:bg-brand peer-checked:border-brand",
              "peer-focus-visible:outline-focus-ring peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2",
            )}
          />
          <Check
            aria-hidden="true"
            size={14}
            strokeWidth={3}
            className="text-on-dark pointer-events-none absolute inset-0 m-auto opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
          />
        </span>
        {label ? <span className="text-body text-primary">{label}</span> : null}
      </label>
    );
  },
);
