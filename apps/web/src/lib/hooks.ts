"use client";

import { useEffect, useState } from "react";

/**
 * T-211/T-212 — الگوی مشترک: مقدار پیش‌فرض همیشه با رندر سرور یکی است
 * (`false`)، فقط بعد از mount با matchMedia واقعی به‌روز می‌شود — از
 * hydration mismatch جلوگیری می‌کند (ر.ک. مستندات skill، بخش هیدریشن).
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setMobile(mq.matches);
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return mobile;
}
