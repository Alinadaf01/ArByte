import { ChevronLeft } from "lucide-react";
import { cn } from "../lib/cn";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * بند ۷ الحاقیه — جداکننده باید در RTL درست بیفتد. کل پروژه فقط RTL است
 * (بند ۱، docs/design)، پس جداکننده مستقیم `ChevronLeft` است (سمت مقصدِ
 * بعدی در ترتیب right-to-left)، نه یک آیکون آینه‌شونده‌ی پویا.
 */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="مسیر ناوبری" dir="rtl" className={className}>
      <ol className="text-caption flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li
              key={`${item.label}-${index}`}
              className="flex items-center gap-1.5"
            >
              {item.href && !isLast ? (
                <a
                  href={item.href}
                  className="text-secondary hover:text-brand transition-colors duration-200"
                >
                  {item.label}
                </a>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn(
                    isLast ? "text-primary font-medium" : "text-secondary",
                  )}
                >
                  {item.label}
                </span>
              )}
              {!isLast ? (
                <ChevronLeft
                  size={14}
                  aria-hidden="true"
                  className="text-caption"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
