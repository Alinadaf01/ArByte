"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ui as uiText } from "@arbyte/contracts";
import { X } from "lucide-react";
import { cn } from "../lib/cn";

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * بند ۷ الحاقیه: تله‌ی فوکوس، Escape می‌بندد، فوکوس بعد از بستن به عنصر
 * قبلی برمی‌گردد — همه رایگان از `@radix-ui/react-dialog`. اگر `description`
 * ندهی، طبق راهنمای رسمی خودِ Radix صریحاً `aria-describedby={undefined}`
 * ست می‌شود تا هشدار dev-only آن‌ها ساکت شود (نه یک توضیح بصری اجباری).
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "bg-surface-dark/35 fixed inset-0 z-50 transition-opacity duration-200",
            "data-[state=open]:opacity-100 data-[state=closed]:opacity-0",
          )}
        />
        <Dialog.Content
          {...(!description && { "aria-describedby": undefined })}
          className={cn(
            "bg-surface shadow-popover fixed left-1/2 top-1/2 z-50 w-[min(480px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-card-lg p-5",
            "transition-[opacity,transform] duration-200 [transition-timing-function:var(--ease-standard)]",
            "data-[state=closed]:scale-95 data-[state=closed]:opacity-0 data-[state=open]:scale-100 data-[state=open]:opacity-100",
            className,
          )}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <Dialog.Title className="text-card-title text-primary font-heading">
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label={uiText.close}
              className="text-secondary flex h-9 w-9 shrink-0 items-center justify-center rounded-tile-sm hover:bg-surface-muted"
            >
              <X size={18} aria-hidden="true" />
            </Dialog.Close>
          </div>
          {description ? (
            <Dialog.Description className="text-caption text-secondary mb-3">
              {description}
            </Dialog.Description>
          ) : null}
          {children}
          {footer ? (
            <div className="mt-4 flex justify-end gap-2">{footer}</div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
