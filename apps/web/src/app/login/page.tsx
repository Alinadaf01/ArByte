import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "ورود به حساب کاربری | آربایت",
  robots: { index: false, follow: false },
};

// E-02 §۲ — صفحه‌ی کاملاً شخصی/تعاملی؛ پیش‌رندر ایستا معنا ندارد.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
