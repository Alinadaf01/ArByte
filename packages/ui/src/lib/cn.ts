import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** ادغام کلاس‌های Tailwind با رفع تعارض (مثل دو `px-*` مختلف). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
