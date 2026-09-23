"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ui as uiText } from "@arbyte/contracts";
import { X } from "lucide-react";
import { cn } from "../lib/cn";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** عنوان — Radix برای دسترسی‌پذیری الزامی می‌داند؛ از caller/لایه‌ی متن می‌آید. */
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Bottom Sheet موبایل — بند ۶.۷۰. روی `@radix-ui/react-dialog` (تله‌ی
 * فوکوس/Escape/برگشت فوکوس رایگان)، با استایل `shadow-sheet` و اسلاید از
 * پایین. `body scroll lock` را خودِ Radix Dialog هنگام باز بودن انجام می‌دهد.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  children,
  footer,
  className,
}: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-surface-dark/35 data-[state=open]:animate-fade-in fixed inset-0 z-50" />
        <Dialog.Content
          {...{ "aria-describedby": undefined }}
          className={cn(
            "shadow-sheet bg-surface fixed inset-x-0 bottom-0 z-50 flex max-h-[86vh] flex-col rounded-t-card-lg",
            "transition-transform duration-300 [transition-timing-function:var(--ease-standard)]",
            "data-[state=closed]:translate-y-full data-[state=open]:translate-y-0",
            className,
          )}
        >
          <div className="border-border-divider flex items-center justify-between border-b px-4 pb-3 pt-3">
            <Dialog.Title className="text-card-title text-primary font-heading">
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label={uiText.close}
              className="text-secondary flex h-9 w-9 items-center justify-center rounded-tile-sm hover:bg-surface-muted"
            >
              <X size={18} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          {footer ? (
            <div className="border-border-divider border-t p-3">{footer}</div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
