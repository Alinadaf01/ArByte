"use client";

import { useRef } from "react";

/**
 * ناوبری کیبورد یک لیست `[role="option"]` — فلش بالا/پایین، Home/End، و
 * تایپ‌برای‌پرش (typeahead) ساده. برای چک‌لیست‌های سفارشی Select که روی
 * `<button role="option">` ساده‌اند (نه Radix)، چون Radix برای این حالت
 * primitive آماده ندارد (بند ۵.۶۸ — کاملاً با کیبورد قابل‌استفاده).
 */
export function useRovingListboxKeyDown(
  containerRef: React.RefObject<HTMLElement | null>,
) {
  const typeaheadRef = useRef({
    buffer: "",
    timer: 0 as unknown as ReturnType<typeof setTimeout>,
  });

  return (event: React.KeyboardEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const items = Array.from(
      container.querySelectorAll<HTMLElement>(
        '[role="option"]:not([disabled])',
      ),
    );
    if (items.length === 0) return;

    const activeIndex = items.indexOf(document.activeElement as HTMLElement);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[activeIndex < items.length - 1 ? activeIndex + 1 : 0]?.focus();
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      items[activeIndex > 0 ? activeIndex - 1 : items.length - 1]?.focus();
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
      return;
    }
    if (event.key.length === 1 && /[\p{L}\p{N}]/u.test(event.key)) {
      const state = typeaheadRef.current;
      clearTimeout(state.timer);
      state.buffer += event.key;
      state.timer = setTimeout(() => {
        state.buffer = "";
      }, 500);
      const match = items.find((item) =>
        item.textContent?.trim().startsWith(state.buffer),
      );
      match?.focus();
    }
  };
}
