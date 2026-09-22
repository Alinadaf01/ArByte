import { forwardRef } from "react";
import { cn } from "../lib/cn";

export interface RadioProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: React.ReactNode;
}

/** روی `<input type="radio">` واقعی — گروه‌بندی با `name` مشترک، رفتار کیبورد رایگان. */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { className, label, id, ...props },
  ref,
) {
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
          type="radio"
          id={id}
          className="peer sr-only"
          {...props}
        />
        <span
          aria-hidden="true"
          className={cn(
            "border-border-input bg-surface pointer-events-none absolute inset-0 rounded-full border transition-colors duration-200",
            "peer-checked:border-brand",
            "peer-focus-visible:outline-focus-ring peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2",
          )}
        />
        <span
          aria-hidden="true"
          className="bg-brand pointer-events-none absolute inset-0 m-auto h-2.5 w-2.5 scale-0 rounded-full opacity-0 transition-[transform,opacity] duration-150 peer-checked:scale-100 peer-checked:opacity-100"
        />
      </span>
      {label ? <span className="text-body text-primary">{label}</span> : null}
    </label>
  );
});
