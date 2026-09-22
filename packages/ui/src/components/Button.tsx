import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "../lib/cn";

/**
 * پنج نوع دکمه (بند ۵.۱۷–۵.۲۴، اکنون با مقادیر واقعی طراحی).
 *
 * `primary` = بنفش برند (`bg-brand`) — دکمه‌ی تأییدشده در `shadow-button-accent`
 * («Accent button»، `Login.dc.html` گرادیان بنفش، ذخیره‌ی تنظیمات ادمین که
 * از طراحی جداگانه‌ی خودش پیروی می‌کند، حلقه‌ی فوکوس همه‌جا بنفش است).
 * `secondary` = پرشده‌ی جوهری (`bg-primary`، ink) — دومین سطح تأکید؛ همان
 * پرکردن تیره‌ای که `Checkout.dc.html`/`Product.dc.html` برای CTAهای
 * حالت پیش‌فرض («پرداخت و ثبت سفارش»، «افزودن به سبد») استفاده می‌کنند،
 * پیش از این‌که هنگام تعامل به بنفش/تینت برود.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-pill font-emphasis text-body",
    "transition-[background-color,color,border-color,transform] duration-200",
    "[transition-timing-function:var(--ease-standard)]",
    "active:scale-(--press-scale-default) disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-on-dark shadow-button-accent hover:bg-brand-active",
        secondary: "bg-primary text-on-dark hover:opacity-90",
        outline:
          "border border-border-input bg-transparent text-primary hover:border-brand hover:text-brand",
        ghost: "bg-transparent text-primary hover:bg-surface-muted",
        destructive: "bg-danger text-on-dark hover:opacity-90",
      },
      size: {
        // حداقل ناحیه‌ی لمسی ۴۴px در موبایل (بند ۵.۶۹) حتی برای دکمه‌ی «sm».
        sm: "h-11 gap-1.5 px-4 md:h-9 md:px-3.5",
        md: "h-11 px-5",
        lg: "h-13 px-6 active:scale-(--press-scale-button-lg)",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

interface ButtonOwnProps extends VariantProps<typeof buttonVariants> {
  /** آیکون کنار متن — جهت‌دارها (فلش/chevron) را خودِ caller باید آینه کند. */
  icon?: React.ReactNode;
  /** سمت آیکون نسبت به جریان متن. پیش‌فرض «start» یعنی سمت راست در RTL (بند ۵.۲۴). */
  iconPosition?: "start" | "end";
}

interface ButtonLoadingProps {
  loading?: boolean;
  /**
   * بند ۵.۲۴: دکمه در حال بارگذاری باید متن جایگزین («در حال ثبت...») نشان
   * دهد؛ چون رشته‌ی فارسی نباید داخل کامپوننت hardcode شود (قانون ۲)، caller
   * باید این متن را بدهد. یک union تفکیک‌شده (اجباریِ کامپایل‌تایم) اینجا
   * عمداً استفاده نشده — `loading` معمولاً یک state بولین پویاست، نه literal
   * `true`، و آن الگو استفاده‌ی معمولی را رد می‌کرد. اگر `loading=true` باشد
   * ولی `loadingText` ندهی، فقط اسپینر بدون متن نشان داده می‌شود.
   */
  loadingText?: string;
}

export type ButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "disabled"
> &
  ButtonOwnProps &
  ButtonLoadingProps & { disabled?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant,
      size,
      icon,
      iconPosition = "start",
      loading,
      loadingText,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref,
  ) {
    const isDisabled = disabled ?? loading ?? false;

    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={16} aria-hidden="true" />
            {loadingText}
          </>
        ) : (
          <>
            {icon && iconPosition === "start" ? icon : null}
            {children}
            {icon && iconPosition === "end" ? icon : null}
          </>
        )}
      </button>
    );
  },
);
