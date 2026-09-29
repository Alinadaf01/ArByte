import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { cn } from "@/lib/cn";

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen">
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
      />

      {/* ms- (margin-inline-start = right side in RTL) clears space for the
          right-anchored sidebar (see Sidebar.tsx's start-0 comment). */}
      <div
        className={cn(
          "flex min-h-screen flex-col transition-all duration-500 ease-spring",
          collapsed ? "lg:ms-20" : "lg:ms-72",
        )}
      >
        <Header onMenuOpen={() => setMobileOpen(true)} />
        <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
