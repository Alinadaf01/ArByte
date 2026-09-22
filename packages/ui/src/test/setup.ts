import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// این پروژه `test.globals` را روشن نمی‌کند (بقیه‌ی پکیج‌ها هم import صریح
// از vitest دارند) — پس پاک‌سازی خودکار Testing Library (که به afterEach
// سراسری تکیه دارد) باید اینجا دستی ثبت شود، وگرنه DOM بین تست‌ها می‌ماند.
afterEach(cleanup);

// jsdom چند API مرورگری که Radix Primitives (Select/Popover/Dialog/Tooltip)
// در محاسبه‌ی موقعیت و pointer capture استفاده می‌کنند را پیاده‌سازی نمی‌کند —
// بدون این stubها تست‌های همین کامپوننت‌ها با خطای «not a function» می‌ترکند
// (محدودیت شناخته‌شده‌ی jsdom، نه باگ کامپوننت).
if (!window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
// jsdom تا این نسخه PointerEvent واقعی ندارد؛ Radix روی pointerdown/pointerup
// برای باز کردن Select/Popover تکیه می‌کند — بدون این polyfill کلیک تست
// اصلاً باز نمی‌شود (نه خطا، فقط سکوت).
if (typeof window.PointerEvent === "undefined") {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    isPrimary: boolean;
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 1;
      this.pointerType = params.pointerType ?? "mouse";
      this.isPrimary = params.isPrimary ?? true;
    }
  }
  // @ts-expect-error -- polyfill عمداً همه‌ی سطح PointerEvent واقعی را ندارد
  window.PointerEvent = PointerEventPolyfill;
}

if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
