/** AUDIT-3 — بخش «بله پی» (apps/admin_api/balepay_admin.py). توکن‌ها فقط ماسک‌شده. */
export interface BalePaySettings {
  enabled: boolean;
  sandbox: boolean;
  botUsername: string;
  botToken: string | null;
  providerToken: string | null;
  webhookConfigured: boolean;
  onlineLimitRial: number;
  onlineLimitToman: number;
  currency: "IRR";
  ready: boolean;
}

export interface BalePaySettingsInput {
  enabled: boolean;
  sandbox: boolean;
  botUsername: string;
  botToken: string;
  providerToken: string;
  onlineLimitRial: number;
}

export interface BalePayTestResult {
  ok: boolean;
  botUsername?: string;
  providerTokenSet?: boolean;
  warning?: string;
  error?: string;
}

export interface BalePayWebhookStatus {
  ok: boolean;
  registered?: boolean;
  pendingUpdates?: number | null;
  lastError?: string | null;
  error?: string;
}

export interface BalePaySession {
  id: number;
  orderId: number;
  orderNumber: string;
  customerPhone: string | null;
  amount: number;
  amountRial: number;
  currency: string;
  reference: string;
  providerPaymentChargeId: string | null;
  status: string;
  createdAt: string;
  paidAt: string | null;
  failureReason: string;
}
