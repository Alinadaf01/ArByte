import { useId } from "react";
import { cn } from "../lib/cn";
import { FormFieldProvider } from "./form-field-context";

export interface FormFieldProps {
  /** برچسب بالای فیلد (بند ۵.۲۶) — رشته را caller از لایه‌ی متن می‌گیرد. */
  label: string;
  /** پیام کمکی زیر فیلد؛ وقتی `errorText` هست نادیده گرفته می‌شود. */
  helpText?: string;
  /** پیام خطا — لحن بند ۲.۱۸/۵.۲۹ («شماره موبایل واردشده صحیح نیست.»)، از caller. */
  errorText?: string;
  required?: boolean;
  id?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * لفاف Label + فیلد + پیام کمکی/خطا (بند ۵.۲۵–۵.۲۹). فیلد داخلی (Input/
 * Textarea/Select/...) خودش با `useFormField()` شناسه و `aria-describedby`/
 * `aria-invalid` را از این کانتکست می‌گیرد — نیازی به کپی دستی id نیست.
 */
export function FormField({
  label,
  helpText,
  errorText,
  required,
  id,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = errorText
    ? `${fieldId}-error`
    : helpText
      ? `${fieldId}-help`
      : undefined;

  return (
    <FormFieldProvider
      value={{
        id: fieldId,
        describedBy: messageId,
        invalid: Boolean(errorText),
      }}
    >
      <div className={cn("flex flex-col gap-1.5", className)}>
        <label
          htmlFor={fieldId}
          className="text-caption text-secondary block text-micro"
        >
          {label}
          {required ? (
            <span className="text-danger ps-1" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
        {children}
        {errorText ? (
          <p id={messageId} role="alert" className="text-danger text-caption">
            {errorText}
          </p>
        ) : helpText ? (
          <p id={messageId} className="text-caption text-secondary">
            {helpText}
          </p>
        ) : null}
      </div>
    </FormFieldProvider>
  );
}
