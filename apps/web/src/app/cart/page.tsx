import type { Metadata } from "next";
import { StorefrontShell } from "@/components/shell/StorefrontShell";
import { CartView } from "./CartView";

export const metadata: Metadata = {
  title: "سبد خرید | آربایت",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <StorefrontShell navActive="cart">
      <CartView />
    </StorefrontShell>
  );
}
