import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const controlClass =
  "w-full rounded-xl border border-white/[0.06] bg-ink-800/60 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 outline-none transition-all duration-300 focus:border-brand-500/40 focus:bg-ink-800 focus:shadow-glow disabled:cursor-not-allowed disabled:opacity-50";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-semibold text-slate-300">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {error ? (
        <p className="text-[11px] font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = ({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn(controlClass, className)} {...props} />
);

export const Textarea = ({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={cn(controlClass, "min-h-24 resize-y", className)}
    {...props}
  />
);

export const Select = ({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className={cn(controlClass, "appearance-none bg-no-repeat", className)}
    {...props}
  >
    {children}
  </select>
);

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300",
          checked ? "bg-brand-500" : "bg-ink-700",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform duration-300 ease-spring",
            checked ? "start-[calc(100%-1.375rem)]" : "start-0.5",
          )}
        />
      </span>
      {label && (
        <span className="text-xs font-semibold text-slate-300">{label}</span>
      )}
    </button>
  );
}
