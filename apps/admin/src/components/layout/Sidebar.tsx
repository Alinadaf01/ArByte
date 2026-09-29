import { NavLink } from "react-router-dom";
import { navGroups } from "@/app/navigation";
import { cn } from "@/lib/cn";
import { usePermissions } from "@/lib/usePermissions";

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function Sidebar({
  mobileOpen,
  onMobileClose,
  collapsed,
  onToggleCollapsed,
}: SidebarProps) {
  const { can } = usePermissions();
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => can(item.section)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink-950/70 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          // start-0 = right edge in RTL (inline-start is where RTL text
          // begins) — this is the sidebar's intended visual side, matching
          // admin-template's right-anchored original. translate-x-full still
          // hides it correctly: physical +X always points further right,
          // which is off-canvas from a right-anchored panel regardless of dir.
          "fixed inset-y-0 start-0 z-40 flex h-screen flex-col border-e border-white/[0.06] bg-ink-900/85 backdrop-blur-2xl transition-all duration-500 ease-spring",
          collapsed ? "lg:w-20" : "lg:w-72",
          mobileOpen
            ? "w-72 translate-x-0"
            : "w-72 translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex items-center gap-3 px-6 pb-6 pt-7">
          {collapsed ? (
            <img
              src="/brand/logo-mark.png"
              alt="آربایت"
              className="hidden size-11 shrink-0 object-contain lg:block"
            />
          ) : null}
          <div className={cn("overflow-hidden", collapsed && "lg:hidden")}>
            <h1 className="sr-only">پنل مدیریت آربایت</h1>
            <img
              src="/brand/logo-horizontal-dark.png"
              alt="آربایت"
              className="h-9 w-auto"
            />
            <p className="mt-1.5 truncate text-[11px] text-slate-500">
              پنل مدیریت
            </p>
          </div>
          <button
            type="button"
            onClick={onMobileClose}
            className="icon-btn ms-auto lg:hidden"
            aria-label="بستن منو"
          >
            <svg
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.8"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-4 pb-4">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="mb-2 truncate px-4 text-[11px] font-semibold tracking-wide text-slate-600">
                  {group.label}
                </p>
              )}
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {group.items.map((item) => (
                  <li key={item.path}>
                    {item.soon ? (
                      <span
                        className="nav-item cursor-not-allowed opacity-50"
                        aria-disabled="true"
                        title={
                          collapsed ? `${item.label} (به‌زودی)` : undefined
                        }
                      >
                        <svg
                          className="size-5 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.8"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d={item.icon}
                          />
                        </svg>
                        {!collapsed && (
                          <>
                            <span className="truncate">{item.label}</span>
                            <span className="ms-auto rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-slate-400">
                              به‌زودی
                            </span>
                          </>
                        )}
                      </span>
                    ) : (
                      <NavLink
                        to={item.path}
                        end={item.path === "/"}
                        onClick={onMobileClose}
                        className={({ isActive }) =>
                          cn("nav-item", isActive && "active")
                        }
                        title={collapsed ? item.label : undefined}
                      >
                        <svg
                          className="size-5 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.8"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d={item.icon}
                          />
                        </svg>
                        {!collapsed && (
                          <span className="truncate">{item.label}</span>
                        )}
                      </NavLink>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="hidden border-t border-white/[0.06] p-3 lg:block">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="icon-btn mx-auto"
            aria-label={collapsed ? "باز کردن سایدبار" : "جمع کردن سایدبار"}
          >
            <svg
              className={cn(
                "size-5 transition-transform duration-300",
                collapsed && "rotate-180",
              )}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.8"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
}
