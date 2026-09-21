"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { SearchProvider } from "./SearchContext";
import { Sidebar } from "./Sidebar";

export function AdminShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // مسیر عوض شد → کشوی موبایل بسته شود (همان رفتار closeSidebar در قالب مرجع).
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <SearchProvider>
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-3 p-3 sm:gap-4 sm:p-4 lg:flex-row lg:items-start lg:gap-6 lg:p-6">
        <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        {drawerOpen ? (
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setDrawerOpen(false)}
            className="bg-surface-dark/35 animate-fade-in fixed inset-0 z-40 lg:hidden"
          />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-4 lg:gap-5">
          <Header onMenuClick={() => setDrawerOpen(true)} />
          <main className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-4 lg:gap-5">
            {children}
          </main>
        </div>
      </div>
    </SearchProvider>
  );
}
