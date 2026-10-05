import { getCategoryTree } from "@/lib/catalog";
import { hasAuthCookie } from "@/lib/server/auth-cookies";
import { getSiteInfo } from "@/lib/content";
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
  const [categories, isAuthenticated, siteInfo] = await Promise.all([
    getCategoryTree(),
    hasAuthCookie(),
    getSiteInfo(),
  ]);

  return (
    <>
      <SiteHeader
        active={headerActive}
        categories={categories}
        isAuthenticated={isAuthenticated}
        phone={siteInfo.phone}
        businessHours={siteInfo.businessHours}
      />
      {children}
      <MobileNavBar active={navActive} isAuthenticated={isAuthenticated} />
      <SiteFooter info={siteInfo} />
    </>
  );
}
