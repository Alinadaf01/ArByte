import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

/**
 * بند ۵.۴۶/۴.۴۹. شکل باید شبیه محتوای واقعی باشد — `shape` را با ابعاد واقعی
 * (className/style) نزدیک به کارت/متن/آواتار واقعی صدا بزن، نه یک مستطیل خام.
 * shimmer با `animate-pulse` (Tailwind) که مثل بقیه‌ی انیمیشن‌های پروژه زیر
 * قانون سراسری `prefers-reduced-motion` در `packages/tokens` متوقف می‌شود.
 */
const skeletonVariants = cva("bg-surface-muted animate-pulse", {
  variants: {
    shape: {
      text: "h-4 w-full rounded-chip",
      circle: "aspect-square rounded-full",
      rect: "h-24 w-full rounded-tile",
    },
  },
  defaultVariants: {
    shape: "text",
  },
});

export interface SkeletonProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  function Skeleton({ className, shape, ...props }, ref) {
    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={cn(skeletonVariants({ shape }), className)}
        {...props}
      />
    );
  },
);
