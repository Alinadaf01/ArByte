import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearStoredAdminAuth,
  loadStoredAdminAuth,
  saveStoredAdminAuth,
} from "@/lib/adminAuthStorage";
import type { AdminUser, AdminLoginResponse } from "@/types/adminAuth";

interface AdminAuthContextValue {
  user: AdminUser | null;
  isAuthenticated: boolean;
  login: (response: AdminLoginResponse) => void;
  logout: () => void;
  markPasswordChanged: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(
    () => loadStoredAdminAuth()?.user ?? null,
  );

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      login: (response) => {
        saveStoredAdminAuth({
          tokens: { access: response.access, refresh: response.refresh },
          user: response.user,
        });
        setUser(response.user);
      },
      logout: () => {
        clearStoredAdminAuth();
        setUser(null);
      },
      markPasswordChanged: () => {
        setUser((prev) => {
          if (!prev) return prev;
          const next = { ...prev, mustChangePassword: false };
          const stored = loadStoredAdminAuth();
          if (stored) saveStoredAdminAuth({ ...stored, user: next });
          return next;
        });
      },
    }),
    [user],
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx)
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  return ctx;
}
