import type { Metadata } from "next";
import { Breadcrumb } from "@arbyte/ui";
import { wishlistPage } from "@arbyte/contracts";
import { StorefrontShell } from "@/components/shell/StorefrontShell";
import { WishlistView } from "@/components/wishlist/WishlistView";

/** T-215 §۳ — `noindex, nofollow` (صفحه‌ی شخصی). */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function WishlistPage() {
  return (
    <StorefrontShell headerActive="" navActive="account">
      <section className="border-border border-b bg-surface px-[5vw] py-8 md:py-11">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4">
          <Breadcrumb
            items={[
              { label: wishlistPage.breadcrumbHome, href: "/" },
              { label: wishlistPage.breadcrumbAccount, href: "/account" },
              { label: wishlistPage.breadcrumbCurrent },
            ]}
          />
          <h1 className="text-hero text-primary font-heading tracking-tight">
            {wishlistPage.title}
          </h1>
        </div>
      </section>

      <div className="mx-auto max-w-[1240px] px-[5vw] py-8 md:py-11">
        <WishlistView />
      </div>
    </StorefrontShell>
  );
}
