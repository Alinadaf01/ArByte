import { forwardRef } from "react";
import { cn } from "../lib/cn";
import { useFormField } from "./form-field-context";

const NUMERIC_TYPES = new Set(["tel", "number", "email"]);

export interface InputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  /** حالت موفقیت (بند ۵.۲۸) — مثلاً بعد از اعتبارسنجی سمت سرور موفق. */
  success?: boolean;
}

/**
 * بند ۵.۲۵–۵.۲۹. شش حالت: default/hover/focus/error/disabled/success —
 * error با `aria-invalid` (از FormField یا مستقیم) کنترل می‌شود.
 *
 * ⚠️ فیلدهای عددی (`type="tel"|"number"|"email"`) پیش‌فرض `dir="ltr"`
 * می‌گیرند حتی داخل صفحه‌ی RTL — بند ۴.۴۴/۵.۲۹، باگ کلاسیک فارسی وگرنه
 * کرسر و ترتیب ارقام به‌هم می‌ریزد. با prop صریح `dir` قابل override است.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className,
    type = "text",
    dir,
    success,
    id,
    "aria-describedby": describedBy,
    ...props
  },
  ref,
) {
  const field = useFormField();
  const resolvedDir = dir ?? (NUMERIC_TYPES.has(type) ? "ltr" : undefined);
  const invalid = props["aria-invalid"] ?? field?.invalid;

  return (
    <input
      ref={ref}
      type={type}
      id={id ?? field?.id}
      dir={resolvedDir}
      aria-describedby={describedBy ?? field?.describedBy}
      aria-invalid={invalid}
      className={cn(
        "border-border-input bg-surface text-primary text-input w-full rounded-tile border px-4 py-2.5",
        "placeholder:text-secondary outline-none transition-colors duration-200",
        "hover:border-brand focus:border-brand focus:ring-brand/15 focus:ring-4",
        resolvedDir === "ltr" && "text-end",
        invalid &&
          "border-danger-border focus:border-danger-border focus:ring-danger-border/15",
        success && "border-success",
        "disabled:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
});
