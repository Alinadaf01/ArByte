/** AUDIT-6 — پنل ترب (apps/torob/admin_views.py). */
export interface TorobStatus {
  enabled: boolean;
  keyConfigured: boolean;
  keyFingerprint: string | null;
  keyError: string;
  endpointUrl: string;
  itemCount: number;
  lastFetchAt: string | null;
  lastFetchItems: number;
  last24h: { requests: number; errors: number; invalidItems: number };
  recentErrors: { at: string; mode: string; status: number; error: string }[];
}

export interface TorobValidation {
  checked: number;
  invalid: number;
  errors: { pageUnique: string; problems: string[] }[];
  withoutImage: string[];
}
