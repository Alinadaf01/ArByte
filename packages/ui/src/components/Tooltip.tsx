import * as RadixTooltip from "@radix-ui/react-tooltip";
import { cn } from "../lib/cn";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "bottom" | "start" | "end";
  delayMs?: number;
}

const SIDE_MAP = {
  top: "top",
  bottom: "bottom",
  start: "right",
  end: "left",
} as const;

/**
 * روی `@radix-ui/react-tooltip` (بند ۷ الحاقیه). هر instance `Provider`ی
 * محلی خودش را دارد — برای صفحاتی با چند Tooltip، بهتر است اپ مصرف‌کننده
 * یک `RadixTooltip.Provider` در ریشه بگذارد (delayDuration مشترک)، ولی
 * بدون آن هم این کامپوننت مستقل درست کار می‌کند.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  delayMs = 300,
}: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={delayMs}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={SIDE_MAP[side]}
            sideOffset={6}
            className={cn(
              "bg-surface-dark text-on-dark shadow-popover z-50 rounded-tile-sm px-2.5 py-1.5 text-caption",
              "data-[state=delayed-open]:animate-fade-in",
            )}
          >
            {content}
            <RadixTooltip.Arrow className="fill-surface-dark" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
