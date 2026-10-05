"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SiteInfo } from "@arbyte/contracts";
import { displayRows } from "@/lib/business-hours";
import type { CategoryTreeNode } from "@arbyte/contracts";
import { siteHeader, toPersianDigits } from "@arbyte/contracts";
import { useCartStore } from "@/lib/stores/cart-store";
import { Logo } from "./Logo";

export type SiteHeaderActive =
  "" | "products" | "categories" | "blog" | "about" | "support";

interface SiteHeaderProps {
  active?: SiteHeaderActive;
  categories: CategoryTreeNode[];
  /** E-02 §۱ — فقط حضور کوکی httpOnly (نه یک ادعای اعتبار واقعی)؛ کنترل
   * می‌کند آیکون حساب به `/account` برود یا `/login`. */
  isAuthenticated?: boolean;
  /** G-01 — تلفن از SiteSettings؛ null = ردیف تلفن کشو پنهان. */
  phone?: SiteInfo["phone"];
  /** ساعت کاری SiteSettings برای ردیف «پشتیبانی آنلاین» کشو. */
  businessHours?: SiteInfo["businessHours"];
}

const navLinkColor = (isActive: boolean) =>
  isActive ? "text-brand-active" : "text-secondary-2";

export function SiteHeader({
  active = "",
  categories,
  isAuthenticated = false,
  phone = null,
  businessHours = [],
}: SiteHeaderProps) {
  const accountHref = isAuthenticated ? "/account" : "/login";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { totalQty } = useCartStore();
  const cartCount = toPersianDigits(totalQty);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  return (
    <>
      {/* دسکتاپ (≥768px) — بند «Responsive System» README: مگامنو با hover/focus باز می‌شود، بدون JS state */}
      <nav
        dir="rtl"
        className="border-border/60 font-sans text-primary sticky top-0 z-30 hidden h-18 items-center gap-[clamp(12px,2vw,30px)] border-b bg-paper/90 px-[5vw] backdrop-blur-md md:flex [@supports_not_(backdrop-filter:blur(1px))]:bg-paper [@supports_not_(backdrop-filter:blur(1px))]:backdrop-blur-none"
      >
        <Link
          href="/"
          aria-label={siteHeader.homeLinkLabel}
          className="flex flex-none items-center"
        >
          <Logo
            variant="horizontal-light"
            alt={siteHeader.logoAlt}
            className="h-8"
            priority
          />
        </Link>

        <div className="flex h-full items-center gap-[clamp(14px,1.6vw,26px)] text-body font-medium">
          {/* AUDIT §۱۲.۱۱ — `group` فقط روی آیتم «محصولات»؛ قبلاً روی کل ردیف
              بود و هاور/فوکوس هر لینک (بلاگ، درباره ما…) مگامنو را باز می‌کرد. */}
          <div className="group relative flex h-full items-center">
            <Link
              href="/products"
              className={`flex items-center gap-1.5 whitespace-nowrap ${navLinkColor(active === "products")}`}
            >
              {siteHeader.nav.products}
              {categories.length > 0 ? (
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 18 18"
                  fill="none"
                  aria-hidden="true"
                  className="transition-transform duration-300 [.group:hover_&]:rotate-180 group-focus-within:rotate-180"
                >
                  <path
                    d="m4.5 7.2 3.8 3.8a1 1 0 0 0 1.4 0l3.8-3.8"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </Link>

            {categories.length > 0 ? (
              <div
                className="shadow-popover border-border hidden absolute start-[-16px] top-[70px] z-40 w-[min(620px,86vw)] grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-x-4.5 gap-y-1.5 rounded-panel border bg-surface p-5 [.group:hover_&]:grid group-focus-within:grid"
                role="menu"
              >
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/category/${category.slug}`}
                    className="hover:bg-brand-tint-2 flex flex-col gap-0.5 rounded-tile-sm px-3 py-2.5 transition-colors duration-200"
                  >
                    <span className="text-body text-primary font-emphasis">
                      {category.name}
                    </span>
                  </Link>
                ))}
                <Link
                  href="/compare"
                  className="hover:bg-brand-tint-2 flex flex-col gap-0.5 rounded-tile-sm px-3 py-2.5 transition-colors duration-200"
                >
                  <span className="text-body text-brand-active font-emphasis">
                    {siteHeader.megaMenu.compareTitle}
                  </span>
                  <span className="text-caption text-secondary">
                    {siteHeader.megaMenu.compareSubtitle}
                  </span>
                </Link>
              </div>
            ) : null}
          </div>

          <Link
            href="/categories"
            className={`whitespace-nowrap ${navLinkColor(active === "categories")}`}
          >
            {siteHeader.nav.categories}
          </Link>
          <Link
            href="/blog"
            className={`whitespace-nowrap ${navLinkColor(active === "blog")}`}
          >
            {siteHeader.nav.blog}
          </Link>
          <Link
            href="/about"
            className={`whitespace-nowrap ${navLinkColor(active === "about")}`}
          >
            {siteHeader.nav.about}
          </Link>
          <Link
            href="/support"
            className={`whitespace-nowrap ${navLinkColor(active === "support")}`}
          >
            {siteHeader.nav.support}
          </Link>
        </div>

        <div className="flex items-center gap-2 ms-auto">
          <Link
            href="/search"
            aria-label={siteHeader.search}
            className="hover:bg-brand-tint-4 flex h-11 w-11 items-center justify-center rounded-icon-button transition-colors duration-200"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
          </Link>
          <Link
            href="/wishlist"
            aria-label={siteHeader.wishlist}
            className="hover:bg-brand-tint-4 flex h-11 w-11 items-center justify-center rounded-icon-button transition-colors duration-200"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20s-7.4-4.6-7.4-9.6A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.4 2.8c0 5-7.4 9.6-7.4 9.6Z" />
            </svg>
          </Link>
          <Link
            href={accountHref}
            aria-label={siteHeader.account}
            className="hover:bg-brand-tint-4 flex h-11 w-11 items-center justify-center rounded-icon-button transition-colors duration-200"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="8.6" r="3.6" />
              <path d="M5 19.5c1.4-3.1 4-4.6 7-4.6s5.6 1.5 7 4.6" />
            </svg>
          </Link>
          <Link
            href="/cart"
            className="hover:bg-brand text-on-dark bg-primary relative flex h-11 items-center gap-2.5 rounded-icon-button px-4 text-body font-emphasis transition-colors duration-[250ms]"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 4h2.2l2 11h9.3l2-8H7" />
              <circle cx="9.5" cy="19" r="1.5" />
              <circle cx="17" cy="19" r="1.5" />
            </svg>
            <span className="bg-accent text-accent-badge-ink flex h-4.5 min-w-4.5 items-center justify-center rounded-pill px-1.5 text-micro font-heading">
              {cartCount}
            </span>
          </Link>
        </div>
      </nav>

      {/* موبایل (≤767px) */}
      <nav
        dir="rtl"
        className="border-border/70 font-sans text-primary sticky top-0 z-30 flex h-14 items-center gap-1 border-b bg-paper px-3 md:hidden"
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label={siteHeader.mobileMenuOpen}
          aria-expanded={drawerOpen}
          className="flex h-11 w-11 flex-none items-center justify-center rounded-tile-sm"
        >
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 7h16M4 12h16M4 17h10" />
          </svg>
        </button>

        <Link
          href="/"
          aria-label={siteHeader.homeLinkLabel}
          className="flex min-w-0 flex-1 items-center justify-center"
        >
          <Logo
            variant="horizontal-light"
            alt={siteHeader.logoAlt}
            className="h-6.5"
          />
        </Link>

        <Link
          href="/search"
          aria-label={siteHeader.search}
          className="flex h-11 w-11 flex-none items-center justify-center rounded-tile-sm"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
        </Link>

        <Link
          href="/cart"
          aria-label={siteHeader.cart}
          className="relative flex h-11 w-11 flex-none items-center justify-center rounded-tile-sm"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 4h2.2l2 11h9.3l2-8H7" />
            <circle cx="9.5" cy="19" r="1.5" />
            <circle cx="17" cy="19" r="1.5" />
          </svg>
          <span className="bg-accent text-accent-badge-ink absolute top-1 start-1 flex h-4 min-w-4 items-center justify-center rounded-pill px-1 text-[10.5px] font-heading">
            {cartCount}
          </span>
        </Link>
      </nav>

      {/* اسکریم + کشوی موبایل */}
      <div
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
        className={`bg-primary/50 fixed inset-0 z-[60] backdrop-blur-[2px] transition-opacity duration-[280ms] md:hidden ${
          drawerOpen ? "visible opacity-100" : "invisible opacity-0"
        }`}
      />
      <aside
        dir="rtl"
        aria-label={siteHeader.drawer.sectionArbyte}
        className={`shadow-drawer fixed inset-y-0 end-0 z-[61] flex w-[min(320px,86vw)] flex-col overflow-y-auto bg-surface text-primary transition-transform duration-300 md:hidden ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ visibility: drawerOpen ? "visible" : "hidden" }}
      >
        <div className="border-border-divider flex items-center justify-between gap-2.5 border-b p-3.5">
          <Logo
            variant="horizontal-light"
            alt={siteHeader.logoAlt}
            className="h-6.5"
          />
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label={siteHeader.mobileMenuClose}
            className="text-secondary-2 flex h-11 w-11 items-center justify-center rounded-tile-sm"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="m7 7 10 10M17 7 7 17" />
            </svg>
          </button>
        </div>

        <Link
          href={accountHref}
          className="bg-primary text-on-dark m-3 mb-1.5 flex items-center gap-3 rounded-tile p-3.5"
        >
          <span className="flex h-9.5 w-9.5 flex-none items-center justify-center rounded-full bg-white/12">
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="8.6" r="3.6" />
              <path d="M5 19.5c1.4-3.1 4-4.6 7-4.6s5.6 1.5 7 4.6" />
            </svg>
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-body text-on-dark font-emphasis">
              {siteHeader.drawer.loginTitle}
            </span>
            <span className="text-caption text-on-dark-secondary">
              {siteHeader.drawer.loginSubtitle}
            </span>
          </span>
        </Link>

        <div className="flex flex-col px-3 pt-2 pb-1">
          <p className="text-micro text-secondary mx-1.5 mt-2.5 mb-1.5 font-heading">
            {siteHeader.drawer.sectionShop}
          </p>
          <DrawerLink href="/products">
            {siteHeader.drawer.allProducts}
          </DrawerLink>
          <DrawerLink href="/categories">
            {siteHeader.drawer.categories}
          </DrawerLink>
          <DrawerLink href="/compare">
            {siteHeader.drawer.compareProducts}
          </DrawerLink>
          <DrawerLink href="/wishlist">{siteHeader.drawer.wishlist}</DrawerLink>

          <p className="text-micro text-secondary mx-1.5 mt-3.5 mb-1.5 font-heading">
            {siteHeader.drawer.sectionSupport}
          </p>
          <DrawerLink href="/track-order">
            {siteHeader.drawer.trackOrder}
          </DrawerLink>
          <DrawerLink href="/support">
            {siteHeader.drawer.contactSupport}
          </DrawerLink>
          <DrawerLink href="/legal">{siteHeader.drawer.legal}</DrawerLink>

          <p className="text-micro text-secondary mx-1.5 mt-3.5 mb-1.5 font-heading">
            {siteHeader.drawer.sectionArbyte}
          </p>
          <DrawerLink href="/blog">{siteHeader.drawer.blog}</DrawerLink>
          <DrawerLink href="/about">{siteHeader.drawer.about}</DrawerLink>
        </div>

        <div className="border-border-divider mt-auto flex flex-col gap-1.5 border-t p-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
          <span className="text-accent-deep inline-flex items-center gap-1.5 text-caption font-emphasis">
            <i
              className="bg-accent block h-1.5 w-1.5 rounded-full"
              aria-hidden="true"
            />
            {siteHeader.drawer.onlineSupport(
              displayRows(businessHours)[0]!.time,
            )}
          </span>
          {phone ? (
            <a
              href={phone.href}
              className="text-primary text-body font-heading"
              dir="ltr"
            >
              {phone.display}
            </a>
          ) : null}
        </div>
      </aside>
    </>
  );
}

function DrawerLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-secondary-2 flex min-h-12 items-center rounded-panel-compact px-3.5 text-body font-medium transition-[background-color,transform] duration-[180ms] hover:bg-brand-tint-3 active:scale-(--press-scale-drawer-row) active:bg-brand-tint-1"
    >
      {children}
    </Link>
  );
}
