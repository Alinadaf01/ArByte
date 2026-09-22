import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

/**
 * بند ۵.۱۴/۳.۲۶. `interactive` hover ظریف است (بند ۵.۷۱): حداکثر ۲px بالا
 * می‌آید + کمی تغییر سایه — نه بزرگ‌نمایی، نه چرخش.
 */
const cardVariants = cva("rounded-card bg-surface", {
  variants: {
    variant: {
      flat: "border border-border",
      raised: "shadow-card",
      interactive: [
        "shadow-card cursor-pointer",
        "transition-[transform,box-shadow] duration-200 [transition-timing-function:var(--ease-standard)]",
        "hover:-translate-y-0.5 hover:shadow-popover",
      ],
    },
    padding: {
      true: "p-4 md:p-[clamp(18px,3vw,26px)]",
      false: "",
    },
  },
  defaultVariants: {
    variant: "flat",
    padding: true,
  },
});

export interface CardProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant, padding, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding }), className)}
      {...props}
    />
  );
});
