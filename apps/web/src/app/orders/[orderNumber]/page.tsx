import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { StorefrontShell } from "@/components/shell/StorefrontShell";
import { hasAuthCookie } from "@/lib/server/auth-cookies";
import { OrderStatusView } from "./OrderStatusView";

export const metadata: Metadata = {
  title: "وضعیت سفارش | آربایت",
  robots: { index: false, follow: false },
};

// بازگشت از درگاه (`?payment=return`) کاملاً پویاست — پیش‌رندر ایستا معنا ندارد.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orderNumber: string }>;
}

export default async function OrderStatusPage({ params }: PageProps) {
  const { orderNumber } = await params;

  // E-05 §۱ — این صفحه فقط برای مالک واردشده‌ی سفارش است؛ مهمان به
  // /track-order می‌رود (E-05 §۲).
  if (!(await hasAuthCookie())) {
    redirect(`/login?next=/orders/${encodeURIComponent(orderNumber)}`);
  }

  return (
    <StorefrontShell>
      <Suspense>
        <OrderStatusView orderNumber={orderNumber} />
      </Suspense>
    </StorefrontShell>
  );
}
