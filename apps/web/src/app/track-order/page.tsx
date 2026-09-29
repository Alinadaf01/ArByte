import type { Metadata } from "next";
import { Suspense } from "react";
import { StorefrontShell } from "@/components/shell/StorefrontShell";
import { TrackOrderView } from "./TrackOrderView";

export const metadata: Metadata = {
  title: "پیگیری سفارش | آربایت",
  robots: { index: false, follow: false },
};

// `?code=` (از لینک QR کارت گارانتی) کاملاً پویاست — پیش‌رندر ایستا معنا ندارد.
export const dynamic = "force-dynamic";

export default function TrackOrderPage() {
  return (
    <StorefrontShell>
      <Suspense>
        <TrackOrderView />
      </Suspense>
    </StorefrontShell>
  );
}
