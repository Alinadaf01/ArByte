import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all duration-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-l from-brand-500 to-brand-600 text-white shadow-glow hover:shadow-glow-lg hover:brightness-110",
        secondary:
          "border border-white/10 bg-white/[0.03] font-semibold text-slate-300 hover:border-brand-500/30 hover:text-brand-300",
        danger: "bg-danger/15 text-danger hover:bg-danger/25",
        ghost: "font-semibold text-slate-400 hover:text-white",
      },
      size: {
        md: "px-5 py-2.5",
        sm: "px-3.5 py-2 text-xs",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className, variant, size, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
