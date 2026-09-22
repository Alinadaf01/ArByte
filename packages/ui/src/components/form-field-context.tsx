import { createContext, useContext } from "react";

export interface FormFieldContextValue {
  id: string;
  describedBy?: string;
  invalid?: boolean;
}

const FormFieldContext = createContext<FormFieldContextValue | null>(null);

export const FormFieldProvider = FormFieldContext.Provider;

/** فیلدهای فرم (Input/Textarea/Select/...) با این هوک id/aria را از FormField اطراف خودشان می‌گیرند. */
export function useFormField(): FormFieldContextValue | null {
  return useContext(FormFieldContext);
}
