import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { StorefrontShell } from "@/components/shell/StorefrontShell";
import { hasAuthCookie } from "@/lib/server/auth-cookies";
import { AccountView } from "./AccountView";

export const metadata: Metadata = {
  title: "حساب کاربری | آربایت",
  robots: { index: false, follow: false },
};

// تب فعال با `?tab=` منعکس می‌شود — پیش‌رندر ایستا معنا ندارد.
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  if (!(await hasAuthCookie())) {
    redirect("/login?next=/account");
  }

  return (
    <StorefrontShell navActive="account">
      <Suspense>
        <AccountView />
      </Suspense>
    </StorefrontShell>
  );
}
