"use client";

import { useEffect, useState } from "react";
import { impersonationBanner } from "@arbyte/contracts";

interface MeResponse {
  data?: {
    mobile?: string;
    firstName?: string | null;
    lastName?: string | null;
    impersonation?: { by: string };
  };
}

/**
 * F-04 — نوار هشدار دائمی سشن Impersonation. فقط وقتی نشانگر `arbyte_imp`
 * هست `/auth/me` را می‌خواند (layout ایستا می‌ماند) و تا خروج از هر صفحه
 * دیده می‌شود. عملیات ممنوع را سرور رد می‌کند، نه این نوار.
 */
export function ImpersonationBanner() {
  const [state, setState] = useState<{ customer: string; by: string } | null>(
    null,
  );

  useEffect(() => {
    if (!document.cookie.split("; ").some((c) => c.startsWith("arbyte_imp=")))
      return;
    fetch("/api/proxy/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<MeResponse>) : null))
      .then((body) => {
        const user = body?.data;
        const imp = user?.impersonation;
        if (!user || !imp) return;
        const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
        setState({ customer: name || user.mobile || "", by: imp.by });
      })
      .catch(() => undefined);
  }, []);

  if (!state) return null;

  async function exit() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.href = "/";
  }

  return (
    <div
      role="alert"
      className="bg-warning text-surface sticky top-0 z-[60] flex flex-wrap items-center justify-center gap-3 px-4 py-2 text-center text-sm font-semibold"
    >
      <span>
        {impersonationBanner.viewingAs(state.customer)} ·{" "}
        {impersonationBanner.by(state.by)}
      </span>
      <button
        type="button"
        onClick={exit}
        className="rounded-full border border-white/60 px-3 py-0.5 text-xs"
      >
        {impersonationBanner.exit}
      </button>
    </div>
  );
}
