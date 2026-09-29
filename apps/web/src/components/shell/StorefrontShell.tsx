import { getCategoryTree } from "@/lib/catalog";
import { hasAuthCookie } from "@/lib/server/auth-cookies";
import { SiteHeader, type SiteHeaderActive } from "./SiteHeader";
import { MobileNavBar, type MobileNavActive } from "./MobileNavBar";
import { SiteFooter } from "./SiteFooter";

interface StorefrontShellProps {
  children: React.ReactNode;
  headerActive?: SiteHeaderActive;
  navActive?: MobileNavActive;
}

/** هر صفحه‌ی فروشگاه: SiteHeader (چسبان) → محتوا → MobileNavBar → SiteFooter (بند «Screens» README). */
export async function StorefrontShell({
  children,
  headerActive = "",
  navActive = "",
}: StorefrontShellProps) {
  const [categories, isAuthenticated] = await Promise.all([
    getCategoryTree(),
    hasAuthCookie(),
  ]);

  return (
    <>
      <SiteHeader
        active={headerActive}
        categories={categories}
        isAuthenticated={isAuthenticated}
      />
      {children}
      <MobileNavBar active={navActive} isAuthenticated={isAuthenticated} />
      <SiteFooter />
    </>
  );
}
