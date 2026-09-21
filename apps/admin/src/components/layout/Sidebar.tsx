"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ServerCog, X } from "lucide-react";
import { dictionary } from "@/lib/dictionary";
import { navGroups } from "@/lib/nav-config";
import { hasPermission } from "@/lib/permissions";
import { toPersianDigits } from "@arbyte/contracts";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      id="admin-sidebar"
      aria-label={dictionary.nav.mainMenuLabel}
      className={[
        "bg-surface shadow-card fixed inset-y-0 right-0 z-50 flex w-[min(86vw,300px)] flex-col p-5",
        "rounded-s-card-lg transition-transform duration-300 ease-out lg:sticky lg:inset-y-auto lg:top-6 lg:z-0",
        "lg:h-[calc(100vh-48px)] lg:w-[280px] lg:translate-x-0 lg:rounded-card-lg lg:shadow-card",
        // dir="rtl" همیشه — سایدبار از راست باز می‌شود؛ حالت بسته با translateX مثبت به بیرون صفحه هل داده می‌شود.
        open ? "translate-x-0" : "translate-x-full",
      ].join(" ")}
    >
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="bg-brand flex h-12 w-12 shrink-0 items-center justify-center rounded-tile">
            <Image
              src="/brand/symbol-purple.svg"
              alt=""
              width={28}
              height={28}
              className="brightness-0 invert"
            />
          </span>
          <div className="min-w-0">
            <p className="text-primary truncate text-body font-heading">
              {dictionary.brand.name}
            </p>
            <p className="text-caption truncate text-micro">
              {dictionary.brand.panelLabel}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={dictionary.nav.closeMenuLabel}
          className="text-secondary flex h-10 w-10 shrink-0 items-center justify-center rounded-tile hover:bg-surface-muted lg:hidden"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {navGroups.map((group) => {
          const items = group.items.filter(
            (item) => !item.permission || hasPermission(item.permission),
          );
          if (items.length === 0) return null;
          return (
            <div key={group.key} className="flex flex-col gap-1">
              {group.label ? (
                <p className="text-caption px-2 pb-1 text-micro font-emphasis">
                  {group.label}
                </p>
              ) : null}
              {items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "flex items-center gap-3 rounded-tile px-3 py-2.5 text-body font-medium transition-colors duration-200",
                      // text-brand روی bg-brand-tint-1 فقط ۴.۲۶:۱ است — کمتر از آستانه‌ی
                      // AA برای متن (۴.۵:۱). text-brand-active (۶.۹۳:۱) درست است.
                      active
                        ? "bg-brand-tint-1 text-brand-active font-emphasis"
                        : "text-secondary hover:bg-surface-muted hover:text-primary",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-tile transition-colors duration-200",
                        active
                          ? "bg-brand text-on-dark"
                          : "bg-surface-muted text-secondary",
                      ].join(" ")}
                    >
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* text-success-text روی bg-surface-muted فقط ۴.۳:۱ است — کمتر از آستانه‌ی AA.
          bg-surface (سفید) + حاشیه، به‌جای پرشدن، کنتراست ۴.۹۷:۱ می‌دهد. */}
      <div className="bg-surface border-border mt-4 flex items-center gap-3 rounded-panel border p-4">
        <span className="bg-success text-on-dark flex h-10 w-10 shrink-0 items-center justify-center rounded-tile">
          <ServerCog size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-caption text-micro">
            {dictionary.serverStatus.label}
          </p>
          <p className="text-success-text truncate text-caption font-emphasis">
            {dictionary.serverStatus.online} {toPersianDigits("99.9")}٪
          </p>
        </div>
      </div>
    </aside>
  );
}
