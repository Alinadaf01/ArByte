import type { AdminTokens, AdminUser } from "@/types/adminAuth";

const STORAGE_KEY = "arbyte-admin-auth";

interface StoredAdminAuth {
  tokens: AdminTokens;
  user: AdminUser;
}

// Guard mirrors the storefront's authStorage.ts, even though this app is
// CSR-only (no prerender pass touches this) — cheap to keep consistent.
const hasLocalStorage = typeof localStorage !== "undefined";

export function loadStoredAdminAuth(): StoredAdminAuth | null {
  if (!hasLocalStorage) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAdminAuth;
  } catch {
    return null;
  }
}

export function saveStoredAdminAuth(auth: StoredAdminAuth): void {
  if (!hasLocalStorage) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export function clearStoredAdminAuth(): void {
  if (!hasLocalStorage) return;
  localStorage.removeItem(STORAGE_KEY);
}
