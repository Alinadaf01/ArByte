import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

/**
 * بج عمومی — بند ۵.۳۵/۶.۱۳/۶.۲۴. کامپوننت فقط رنگ/شکل می‌دهد؛ متن همیشه از
 * `children` می‌آید (قانون ۲ — بدون رشته‌ی فارسی داخل کامپوننت). caller دو
 * خانواده را با `tone` پیاده می‌کند:
 *   - وضعیت کالا (بند ۶.۱۳: آکبند/اپن‌باکس/استوک/در حد نو) → `tone="neutral"`
 *     برای هر چهار — این‌ها توصیفی‌اند نه هشدار، رنگ‌کدگذاری لازم ندارند.
 *   - موجودی (بند ۶.۲۴) → موجود=`success`، محدود=`warning`،
 *     ناموجود=`neutral`، به‌زودی=`info`.
 * بند ۴.۵۲: `brand` فقط برای برچسب‌های برندی، نه وضعیت. بند ۵.۶۸: رنگ
 * به‌تنهایی معنا نمی‌دهد — به همین دلیل `children` اختیاری نیست.
 */
const badgeVariants = cva(
  "inline-flex w-fit items-center gap-1 rounded-chip border px-2.5 py-1 text-micro font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-surface-muted text-secondary-2 border-border",
        // ۸٪ نه ۱۰٪ — طبق محاسبه‌ی کنتراست (§۵.۵ الحاقیه)، در ۱۰٪ نسبت متن
        // روی پس‌زمینه‌ی تینت‌شده به‌جای روی سفید فقط ~۴.۴۶:۱ می‌شد (زیر
        // آستانه‌ی AA برای متن معمولی، ۴.۵:۱) — همان الگوی درسِ T-100.
        success: "bg-success/8 text-success-text border-success/20",
        warning: "bg-warning/5 text-warning border-warning/20",
        info: "bg-info/8 text-info border-info/20",
        danger: "bg-danger-tint text-danger border-danger-border",
        brand: "bg-brand-tint-1 text-brand-active border-border-done",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, tone, icon, children, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(badgeVariants({ tone }), className)}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
});
