import { getCategoryTree } from "@/lib/catalog";
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
  const categories = await getCategoryTree();

  return (
    <>
      <SiteHeader active={headerActive} categories={categories} />
      {children}
      <MobileNavBar active={navActive} />
      <SiteFooter />
    </>
  );
}
