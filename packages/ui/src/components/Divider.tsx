import { forwardRef } from "react";
import { cn } from "../lib/cn";

export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  /** عمودی برای جداکننده‌ی داخل نوار افقی (مثلاً بین دو دکمه). */
  orientation?: "horizontal" | "vertical";
}

/**
 * خط جداکننده‌ی ظریف — توکن `--color-border-divider` (Line-3، جداکننده‌ی
 * داخلی روی سفید). برای بردر کارت/چیپ از `border-border`/`border-border-input`
 * مستقیم روی خود عنصر استفاده کن، این کامپوننت فقط برای یک خط مستقل است.
 */
export const Divider = forwardRef<HTMLHRElement, DividerProps>(function Divider(
  { orientation = "horizontal", className, ...props },
  ref,
) {
  return (
    <hr
      ref={ref}
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "border-border-divider shrink-0 border-0",
        orientation === "horizontal"
          ? "h-px w-full"
          : "h-full w-px self-stretch",
        className,
      )}
      {...props}
    />
  );
});
