"use client";

import { useEffect } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

/**
 * بند ۷ الحاقیه: `role="status"` و `aria-live="polite"`. طبق نمونه‌ی طراحی
 * (toast افزودن به سبد، `Product.dc.html`) — ثابت، وسط‌چین پایین صفحه،
 * ورود با `animate-toast-in`. این کامپوننت فقط پوسته‌ی عمومی است؛ ترکیب
 * دقیق (آیکون تیک، قیمت، دکمه‌ی «دیدن سبد») صفحه‌محور است، نه اینجا.
 */
const toastVariants = cva(
  [
    "fixed inset-x-0 z-[60] mx-auto flex w-fit max-w-[420px] items-center gap-3 rounded-panel-compact px-4 py-3",
    "animate-toast-in bottom-[calc(80px+env(safe-area-inset-bottom))] md:bottom-[26px]",
  ],
  {
    variants: {
      tone: {
        dark: "bg-surface-dark text-on-dark shadow-popover",
        light: "bg-surface text-primary shadow-popover border border-border",
      },
    },
    defaultVariants: {
      tone: "dark",
    },
  },
);

export interface ToastProps extends VariantProps<typeof toastVariants> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** ناپدیدشدن خودکار بعد این‌مدت (ms) — طبق نمونه‌ی طراحی ۲۸۰۰. `undefined` یعنی فقط دستی بسته شود. */
  durationMs?: number;
  children: React.ReactNode;
  className?: string;
}

export function Toast({
  open,
  onOpenChange,
  durationMs = 2800,
  tone,
  children,
  className,
}: ToastProps) {
  useEffect(() => {
    if (!open || !durationMs) return;
    const timer = setTimeout(() => onOpenChange(false), durationMs);
    return () => clearTimeout(timer);
  }, [open, durationMs, onOpenChange]);

  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(toastVariants({ tone }), className)}
    >
      {children}
    </div>
  );
}
