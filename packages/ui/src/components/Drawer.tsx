import * as Dialog from "@radix-ui/react-dialog";
import { ui as uiText } from "@arbyte/contracts";
import { X } from "lucide-react";
import { cn } from "../lib/cn";

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** لبه‌ی باز شدن — منطقی، نه فیزیکی (بند ۱۰). پیش‌فرض «start» یعنی راست در RTL. */
  side?: "start" | "end";
  children: React.ReactNode;
  className?: string;
}

/**
 * پنل کناری — مثل Drawer موبایل `SiteHeader` (طراحی). روی
 * `@radix-ui/react-dialog`، تله‌ی فوکوس/Escape/برگشت فوکوس رایگان.
 * `shadow-drawer` (`-18px 0 44px`) برای همان راست‌آویز پیش‌فرض طراحی شده.
 */
export function Drawer({
  open,
  onOpenChange,
  title,
  side = "start",
  children,
  className,
}: DrawerProps) {
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
          {...{ "aria-describedby": undefined }}
          className={cn(
            "shadow-drawer bg-surface fixed inset-y-0 z-50 flex w-[min(320px,86vw)] flex-col",
            side === "start" ? "start-0" : "end-0",
            "transition-transform duration-300 [transition-timing-function:var(--ease-standard)]",
            side === "start"
              ? "data-[state=closed]:-translate-x-full rtl:data-[state=closed]:translate-x-full"
              : "data-[state=closed]:translate-x-full rtl:data-[state=closed]:-translate-x-full",
            "data-[state=open]:translate-x-0",
            className,
          )}
        >
          <div className="border-border-divider flex items-center justify-between border-b px-4 py-3">
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
