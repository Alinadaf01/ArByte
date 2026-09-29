import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const chipVariants = cva("chip", {
  variants: {
    tone: {
      brand: "bg-brand-500/12 text-brand-300",
      success: "bg-success/10 text-success",
      warning: "bg-warning/10 text-warning",
      danger: "bg-danger/10 text-danger",
      neutral: "bg-white/[0.06] text-slate-400",
    },
  },
  defaultVariants: { tone: "neutral" },
});

const dotToneClass: Record<string, string> = {
  brand: "bg-brand-400",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-slate-400",
};

export interface ChipProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof chipVariants> {
  dot?: boolean;
}

export function Chip({ tone, dot, className, children, ...props }: ChipProps) {
  return (
    <span
      className={cn(chipVariants({ tone }), "whitespace-nowrap", className)}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            dotToneClass[tone ?? "neutral"],
          )}
        />
      )}
      {children}
    </span>
  );
}
