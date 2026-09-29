import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StorefrontShell } from "@/components/shell/StorefrontShell";
import { hasAuthCookie } from "@/lib/server/auth-cookies";
import { CheckoutView } from "./CheckoutView";

export const metadata: Metadata = {
  title: "تکمیل خرید | آربایت",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  // E-02 §۴ — نیازمند ورود؛ نه → /login?next=/checkout (مهمان اجازه‌ی
  // تسویه ندارد، §۶ محدودیت‌ها). سبد خالی → /cart سمت کلاینت (CheckoutView)
  // چون فقط آنجا به کوکی httpOnly (از طریق پراکسی) دسترسی واقعی هست.
  if (!(await hasAuthCookie())) {
    redirect("/login?next=/checkout");
  }

  return (
    <StorefrontShell navActive="cart">
      <CheckoutView />
    </StorefrontShell>
  );
}
