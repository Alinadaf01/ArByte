import { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "تأیید",
  cancelLabel = "انصراف",
  danger = true,
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div
        className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="glass-card relative w-full max-w-sm animate-scale-in !bg-ink-850/95 p-6">
        <h3 className="m-0 text-base font-bold text-white">{title}</h3>
        {description && (
          <p className="m-0 mt-2 text-sm leading-7 text-slate-400">
            {description}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-slate-300 transition-all duration-300 hover:border-white/20 hover:text-white disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={cn(
              "rounded-xl px-4 py-2 text-xs font-bold transition-all duration-300 active:scale-95 disabled:opacity-50",
              danger
                ? "bg-danger/15 text-danger hover:bg-danger/25"
                : "bg-gradient-to-l from-brand-500 to-brand-600 text-ink-950 shadow-glow hover:shadow-glow-lg",
            )}
          >
            {pending ? "در حال انجام…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
