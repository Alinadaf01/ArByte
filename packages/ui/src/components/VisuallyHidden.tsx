import { forwardRef } from "react";
import * as RadixVisuallyHidden from "@radix-ui/react-visually-hidden";

/**
 * محتوایی که فقط برای screen reader است — از نظر بصری مخفی، اما در جریان
 * تب/خواندن صفحه حاضر. مثال: متن کامل یک دکمه‌ی فقط-آیکون وقتی `aria-label`
 * کافی نیست (مثلاً وقتی محتوای پویا هم باید خوانده شود).
 */
export const VisuallyHidden = forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof RadixVisuallyHidden.Root>
>(function VisuallyHidden(props, ref) {
  return <RadixVisuallyHidden.Root ref={ref} {...props} />;
});
