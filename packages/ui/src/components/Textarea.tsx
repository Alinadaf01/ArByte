import { forwardRef } from "react";
import { cn } from "../lib/cn";
import { useFormField } from "./form-field-context";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  success?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      className,
      success,
      id,
      rows = 4,
      "aria-describedby": describedBy,
      ...props
    },
    ref,
  ) {
    const field = useFormField();
    const invalid = props["aria-invalid"] ?? field?.invalid;

    return (
      <textarea
        ref={ref}
        id={id ?? field?.id}
        rows={rows}
        aria-describedby={describedBy ?? field?.describedBy}
        aria-invalid={invalid}
        className={cn(
          "border-border-input bg-surface text-primary text-input w-full resize-y rounded-tile border px-4 py-2.5",
          "placeholder:text-secondary outline-none transition-colors duration-200",
          "hover:border-brand focus:border-brand focus:ring-brand/15 focus:ring-4",
          invalid &&
            "border-danger-border focus:border-danger-border focus:ring-danger-border/15",
          success && "border-success",
          "disabled:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      />
    );
  },
);
