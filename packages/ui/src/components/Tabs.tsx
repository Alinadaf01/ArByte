"use client";

import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "../lib/cn";

/**
 * بند ۷ الحاقیه: فلش چپ/راست بین تب‌ها، در RTL معکوس. Radix Tabs جهت را
 * از `dir` روی Root می‌خواند، نه از `dir` محیطی صفحه — چون کل پروژه RTL است
 * (بند ۱، docs/design)، اینجا صریح `dir="rtl"` ست شده تا وابسته به تنظیم
 * بیرونی نباشد.
 */
export function Tabs(
  props: React.ComponentPropsWithoutRef<typeof RadixTabs.Root>,
) {
  return <RadixTabs.Root dir="rtl" {...props} />;
}

export function TabsList({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixTabs.List>) {
  return (
    <RadixTabs.List
      className={cn(
        "border-border-divider flex gap-1 overflow-x-auto border-b",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixTabs.Trigger>) {
  return (
    <RadixTabs.Trigger
      className={cn(
        "text-body text-secondary shrink-0 whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 font-medium",
        "outline-none transition-colors duration-200",
        "data-[state=active]:text-brand data-[state=active]:border-brand",
        "hover:text-primary disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadixTabs.Content>) {
  return (
    <RadixTabs.Content
      className={cn("pt-4 outline-none", className)}
      {...props}
    />
  );
}
