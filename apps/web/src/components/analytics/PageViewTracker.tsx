"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * G-02 — ثبت بازدید بدون کوکی (`POST /analytics/pageview` از مسیر BFF تا
 * آی‌پی واقعی به‌صورت امضاشده برسد). فقط مسیر، بدون query؛ خطا بی‌صدا.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    const body = JSON.stringify({
      path: pathname,
      referrer: document.referrer.slice(0, 500),
    });
    fetch("/api/proxy/analytics/pageview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);
  return null;
}
