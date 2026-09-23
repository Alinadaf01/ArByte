"use client";

import Link from "next/link";
import { mobileNavBar, toPersianDigits } from "@arbyte/contracts";
import { useCartStore } from "@/lib/stores/cart-store";

export type MobileNavActive =
  "" | "home" | "categories" | "search" | "cart" | "account";

interface MobileNavBarProps {
  active?: MobileNavActive;
}

interface NavItem {
  key: MobileNavActive;
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

function iconStroke(active: boolean) {
  return active ? "2.1" : "1.7";
}

const items = (cartCount: string): NavItem[] => [
  {
    key: "home",
    href: "/",
    label: mobileNavBar.home,
    icon: (active) => (
      <svg
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={iconStroke(active)}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19Z" />
      </svg>
    ),
  },
  {
    key: "categories",
    href: "/categories",
    label: mobileNavBar.categories,
    icon: (active) => (
      <svg
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={iconStroke(active)}
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3.5" y="3.5" width="7.2" height="7.2" rx="2.2" />
        <rect x="13.3" y="3.5" width="7.2" height="7.2" rx="2.2" />
        <rect x="3.5" y="13.3" width="7.2" height="7.2" rx="2.2" />
        <rect x="13.3" y="13.3" width="7.2" height="7.2" rx="2.2" />
      </svg>
    ),
  },
  {
    key: "search",
    href: "/search",
    label: mobileNavBar.search,
    icon: (active) => (
      <svg
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={iconStroke(active)}
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </svg>
    ),
  },
  {
    key: "cart",
    href: "/cart",
    label: mobileNavBar.cart,
    icon: (active) => (
      <span className="relative">
        <svg
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={iconStroke(active)}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 4h2.2l2 11h9.3l2-8H7" />
          <circle cx="9.5" cy="19" r="1.5" />
          <circle cx="17" cy="19" r="1.5" />
        </svg>
        <span
          key={cartCount}
          className="bg-accent text-accent-badge-ink animate-badge-pop absolute -top-1 start-[calc(50%-11px)] flex h-4 min-w-4 items-center justify-center rounded-pill px-1 text-[10.5px] font-heading"
        >
          {cartCount}
        </span>
      </span>
    ),
  },
  {
    key: "account",
    href: "/login",
    label: mobileNavBar.account,
    icon: (active) => (
      <svg
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={iconStroke(active)}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="8.6" r="3.6" />
        <path d="M5 19.5c1.4-3.1 4-4.6 7-4.6s5.6 1.5 7 4.6" />
      </svg>
    ),
  },
];

export function MobileNavBar({ active = "" }: MobileNavBarProps) {
  const { totalQty } = useCartStore();
  const cartCount = toPersianDigits(totalQty);

  return (
    <>
      <nav
        dir="rtl"
        aria-label={mobileNavBar.ariaLabel}
        className="shadow-bottom-nav border-border fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 gap-0.5 border-t bg-surface px-1.5 pt-1.5 font-sans md:hidden"
        style={{ paddingBottom: "calc(6px + env(safe-area-inset-bottom))" }}
      >
        {items(cartCount).map((item) => {
          const isActive = active === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-13 flex-col items-center justify-center gap-1 rounded-tile ${
                isActive ? "text-brand-active" : "text-secondary"
              }`}
            >
              {item.icon(isActive)}
              <span
                className={`text-[10.5px] ${isActive ? "font-heading" : "font-medium"}`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
      <div
        aria-hidden="true"
        className="h-16 md:hidden"
        style={{ height: "calc(64px + env(safe-area-inset-bottom))" }}
      />
    </>
  );
}
