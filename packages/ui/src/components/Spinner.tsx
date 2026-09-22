import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../lib/cn";
import { VisuallyHidden } from "./VisuallyHidden";

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: number;
  /** وقتی Spinner مستقل (نه داخل Button) استفاده می‌شود، برچسب برای screen reader لازم است. */
  label?: string;
}

/** چرخش با توکن `--animate-spin` (۷۲۰ms). داخل `Button` خودِ دکمه aria-busy را مدیریت می‌کند. */
export const Spinner = forwardRef<HTMLSpanElement, SpinnerProps>(
  function Spinner({ className, size = 20, label, ...props }, ref) {
    return (
      <span
        ref={ref}
        role={label ? "status" : undefined}
        className={cn("inline-flex", className)}
        {...props}
      >
        <Loader2 size={size} className="animate-spin" aria-hidden="true" />
        {label ? <VisuallyHidden>{label}</VisuallyHidden> : null}
      </span>
    );
  },
);
