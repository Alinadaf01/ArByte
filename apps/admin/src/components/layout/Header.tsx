import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/lib/AdminAuthContext";
import { cn } from "@/lib/cn";

// Deliberately no search box or notification bell yet — both would be
// decorative-only until A2 wires real data behind them, and this project's
// brand book treats a button that doesn't work as worse than no button.

export function Header({ onMenuOpen }: { onMenuOpen: () => void }) {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  const fullName = user
    ? `${user.firstName} ${user.lastName}`.trim() || user.phone
    : "";
  const initials = user
    ? (user.firstName.charAt(0) || user.phone.slice(-2)).toUpperCase()
    : "";

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-ink-950/70 backdrop-blur-xl">
      <div className="flex h-[4.5rem] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenuOpen}
          className="icon-btn lg:hidden"
          aria-label="باز کردن منو"
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
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>

        <div className="relative ms-auto">
          <button
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
            className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-ink-800/60 py-1.5 pe-3 ps-1.5 transition-all duration-300 hover:border-brand-500/30"
            aria-haspopup="true"
            aria-expanded={profileOpen}
          >
            <span className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-extrabold text-white">
              {initials}
            </span>
            <span className="hidden text-end md:block">
              <span className="block text-xs font-bold text-white">
                {fullName}
              </span>
              <span dir="ltr" className="block text-[10px] text-slate-500">
                {user?.phone}
              </span>
            </span>
            <svg
              className={cn(
                "hidden size-4 text-slate-500 transition-transform duration-300 md:block",
                profileOpen && "-rotate-180",
              )}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 8.25l-7.5 7.5-7.5-7.5"
              />
            </svg>
          </button>

          {profileOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setProfileOpen(false)}
                aria-hidden="true"
              />
              <div className="glass-card absolute end-0 top-14 z-20 w-64 overflow-hidden !bg-ink-850/95 p-0">
                <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-base font-extrabold text-white">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="m-0 truncate text-sm font-bold text-white">
                      {fullName}
                    </p>
                    <p
                      dir="ltr"
                      className="m-0 truncate text-[11px] text-slate-500"
                    >
                      {user?.phone}
                    </p>
                  </div>
                </div>
                <div className="p-2">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="profile-menu-item w-full !text-danger hover:!bg-danger/10"
                  >
                    <svg
                      className="size-4 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.8"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                      />
                    </svg>
                    خروج از حساب
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
