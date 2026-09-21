"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, Menu, Search, X } from "lucide-react";
import { toPersianDigits } from "@arbyte/contracts";
import { dictionary } from "@/lib/dictionary";
import { getPageMeta } from "@/lib/page-meta";
import { usePageSearch } from "./SearchContext";

// داده‌ی نمایشی — معادل ردیف‌های واقعی که بعداً از API اعلان‌ها می‌آید، نه رشته‌ی رابط کاربری.
const DEMO_NOTIFICATIONS = [
  {
    title: "سفارش جدید",
    detail: "سفارش #ARB-14042738 ثبت شد",
    time: "۲ دقیقه پیش",
  },
  {
    title: "هشدار موجودی",
    detail: "موجودی «MSI Titan 18 HX» کم شد",
    time: "۱ ساعت پیش",
  },
];

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const meta = getPageMeta(pathname);
  const { term, setTerm } = usePageSearch();
  const [openPanel, setOpenPanel] = useState<
    "search" | "notify" | "profile" | null
  >(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpenPanel(null);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenPanel(null);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  const togglePanel = (panel: "search" | "notify" | "profile") => {
    setOpenPanel((current) => (current === panel ? null : panel));
  };

  return (
    <header
      ref={rootRef}
      className="bg-surface shadow-card relative z-40 flex items-center gap-3 rounded-card px-4 py-3 sm:px-5"
    >
      <button
        type="button"
        onClick={onMenuClick}
        aria-label={dictionary.nav.openMenuLabel}
        className="text-secondary flex h-11 w-11 shrink-0 items-center justify-center rounded-tile hover:bg-surface-muted lg:hidden"
      >
        <Menu size={20} aria-hidden="true" />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="text-primary truncate text-subhead font-heading">
          {meta.title}
        </h1>
        <p className="text-caption truncate text-micro">{meta.subtitle}</p>
      </div>

      <div className="relative flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => togglePanel("search")}
          aria-label={dictionary.header.searchLabel}
          aria-expanded={openPanel === "search"}
          className={[
            "flex h-11 w-11 items-center justify-center rounded-tile border transition-colors duration-200",
            openPanel === "search"
              ? "border-brand text-brand"
              : "border-border text-secondary hover:text-brand hover:border-brand",
          ].join(" ")}
        >
          <Search size={18} aria-hidden="true" />
        </button>
        {openPanel === "search" ? (
          <div className="bg-surface shadow-popover absolute end-0 top-[calc(100%+8px)] z-50 w-[min(300px,90vw)] rounded-panel p-3">
            <label className="border-border flex items-center gap-2 rounded-tile border px-3 py-1">
              <Search
                size={16}
                aria-hidden="true"
                className="text-caption shrink-0"
              />
              <input
                type="search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder={dictionary.header.searchPlaceholder}
                className="text-body min-w-0 flex-1 bg-transparent py-2 outline-none"
                autoFocus
              />
              {term ? (
                <button
                  type="button"
                  onClick={() => setTerm("")}
                  aria-label={dictionary.header.searchClearLabel}
                  className="text-caption shrink-0"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              ) : null}
            </label>
            <p className="text-caption mt-2 px-1 text-micro">
              {dictionary.header.searchHint}
            </p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => togglePanel("notify")}
          aria-label={dictionary.header.notificationsLabel}
          aria-expanded={openPanel === "notify"}
          className={[
            "relative flex h-11 w-11 items-center justify-center rounded-tile border transition-colors duration-200",
            openPanel === "notify"
              ? "border-brand text-brand"
              : "border-border text-secondary hover:text-brand hover:border-brand",
          ].join(" ")}
        >
          <Bell size={18} aria-hidden="true" />
          {DEMO_NOTIFICATIONS.length > 0 ? (
            <span className="bg-danger text-on-dark absolute -end-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-pill px-1 text-[10px] font-emphasis">
              {toPersianDigits(DEMO_NOTIFICATIONS.length)}
            </span>
          ) : null}
        </button>
        {openPanel === "notify" ? (
          <div className="bg-surface shadow-popover absolute end-0 top-[calc(100%+8px)] z-50 w-[min(300px,90vw)] rounded-panel p-2">
            {DEMO_NOTIFICATIONS.length === 0 ? (
              <p className="text-caption p-3 text-center text-micro">
                {dictionary.header.notificationsEmpty}
              </p>
            ) : (
              DEMO_NOTIFICATIONS.map((n, i) => (
                <div
                  key={i}
                  className="rounded-tile px-3 py-2.5 hover:bg-surface-muted"
                >
                  <p className="text-primary text-body font-emphasis">
                    {n.title}
                  </p>
                  <p className="text-caption mt-0.5 text-micro">{n.detail}</p>
                  <p className="text-caption mt-1 text-micro">{n.time}</p>
                </div>
              ))
            )}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => togglePanel("profile")}
          aria-label={dictionary.header.profileLabel}
          aria-expanded={openPanel === "profile"}
          className={[
            "border-border flex items-center gap-2 rounded-tile border py-1 ps-1 pe-2 transition-colors duration-200 sm:pe-3",
            openPanel === "profile" ? "border-brand" : "hover:border-brand",
          ].join(" ")}
        >
          <span className="hidden text-end sm:block">
            <span className="text-primary block text-body font-emphasis">
              {dictionary.header.profileName}
            </span>
            <span className="text-caption block text-micro">
              {dictionary.header.profileRole}
            </span>
          </span>
          <span className="bg-brand text-on-dark flex h-9 w-9 items-center justify-center rounded-tile text-body font-emphasis">
            {dictionary.header.profileName.charAt(0)}
          </span>
        </button>
        {openPanel === "profile" ? (
          <div className="bg-surface shadow-popover absolute end-0 top-[calc(100%+8px)] z-50 w-[min(220px,90vw)] rounded-panel p-2">
            <button
              type="button"
              className="text-primary block w-full rounded-tile px-3 py-2.5 text-start text-body hover:bg-surface-muted"
            >
              {dictionary.header.profileSettings}
            </button>
            <button
              type="button"
              className="text-danger block w-full rounded-tile px-3 py-2.5 text-start text-body hover:bg-surface-muted"
            >
              {dictionary.header.profileLogout}
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
