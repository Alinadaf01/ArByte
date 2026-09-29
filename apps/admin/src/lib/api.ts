import {
  loadStoredAdminAuth,
  saveStoredAdminAuth,
  clearStoredAdminAuth,
} from "@/lib/adminAuthStorage";
import type { AdminLoginResponse } from "@/types/adminAuth";
import type { PaginatedResponse } from "@/types/api";
import type { AdminOrder } from "@/types/order";
import type {
  AdminSiteSettings,
  ApiCredential,
  ApiCredentialService,
  ShippingMethod,
  SmsLog,
  SmsTemplate,
} from "@/types/settings";
import type {
  AdminAddress,
  AdminUser,
  AdminUserListItem,
  CreateUserFormValues,
  UpdateUserFormValues,
} from "@/types/user";
import type { AdminContactMessage } from "@/types/message";
import type { AdminProductReview, ReviewStatus } from "@/types/review";
import type { AdminReturn } from "@/types/return";
import type { AdminActivityLogEntry } from "@/types/activity";
import type { AdminCoupon, CouponFormValues } from "@/types/coupon";
import type { AdminBlogPost, BlogPostFormValues } from "@/types/blog";
import type {
  AbandonedCartsReport,
  ByCategoryRow,
  ByGatewayRow,
  ConversionReport,
  CustomersReport,
  GrossMarginReport,
  ReportGroupBy,
  ReturnRateReport,
  SalesReport,
  TopProductRow,
  TopProductsBy,
} from "@/types/report";
import type { DashboardSummary } from "@/types/dashboard";
import type {
  SearchConsoleIndexStatus,
  SearchConsolePageRow,
  SearchConsolePerformance,
  SearchConsoleQueryRow,
  SearchConsoleSitemapStatus,
} from "@/types/searchConsole";
import type {
  AdminRole,
  AdminRoleFormValues,
  AdminSection,
  MyPermissions,
} from "@/types/role";
import type {
  ForceLogoutResponse,
  ImpersonateResponse,
  ResetPasswordResponse,
} from "@/types/accountAdmin";
import type {
  AboutPageContent,
  LegalDocumentContent,
} from "@/types/contentPages";
import type { AdminRedirect, RedirectFormValues } from "@/types/redirect";

// No fake-data phase here, unlike the storefront's src/lib/api.ts — B6's
// real /api/admin/ endpoints already exist, so every function below always
// hits the real backend. Base URL always resolves to something (falls back
// to same-origin /api/admin) rather than throwing, since this app has no
// fallback-to-fixtures story to guard against an unconfigured backend.
const API_BASE_URL =
  (import.meta.env.VITE_ADMIN_API_BASE_URL as string | undefined)?.replace(
    /\/+$/,
    "",
  ) || "/api/admin";

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, init);
}

async function readErrorDetail(
  response: Response,
  fallback: string,
): Promise<string> {
  const body = await response.json().catch(() => null);
  return body &&
    typeof body === "object" &&
    "detail" in body &&
    typeof body.detail === "string"
    ? body.detail
    : fallback;
}

// Validation errors use DRF's default { [field]: string[] } shape (see
// ADMIN-API-CONTRACT.md Conventions) — surfaced once A2's forms need it.
export class ApiFieldError extends Error {
  field: string;
  constructor(field: string, message: string) {
    super(message);
    this.field = field;
  }
}

export async function readFieldError(
  response: Response,
  fallback: string,
): Promise<ApiFieldError> {
  const body = await response.json().catch(() => null);
  if (body && typeof body === "object") {
    const [field, messages] = Object.entries(body)[0] ?? [];
    const message = Array.isArray(messages) ? messages[0] : messages;
    if (field && typeof message === "string")
      return new ApiFieldError(field, message);
  }
  return new ApiFieldError("detail", fallback);
}

export async function adminLogin(
  phone: string,
  password: string,
): Promise<AdminLoginResponse> {
  let res: Response;
  try {
    res = await apiFetch("/auth/login/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });
  } catch {
    throw new Error("ورود ممکن نشد. اتصال اینترنت را بررسی کنید.");
  }
  if (!res.ok)
    throw new Error(
      await readErrorDetail(res, "شماره یا رمز عبور اشتباه است."),
    );
  return res.json();
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await apiFetch("/auth/refresh/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
  });
  if (!res.ok) throw new Error("refresh failed");
  const data = (await res.json()) as { access: string };
  return data.access;
}

/** Attaches the current access token; on 401 refreshes once via the stored
 * refresh token and retries, clearing the session if that also fails.
 * Every future admin page's data fetch (A2+) goes through this. */
export async function authorizedFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const stored = loadStoredAdminAuth();
  if (!stored) throw new Error("ابتدا وارد پنل شوید.");

  // FormData bodies (image uploads) must NOT get an explicit Content-Type —
  // the browser sets multipart/form-data with the correct boundary itself.
  const isFormData = init.body instanceof FormData;
  const doFetch = (accessToken: string) =>
    apiFetch(path, {
      ...init,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...init.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });

  let response = await doFetch(stored.tokens.access);
  if (response.status === 401) {
    try {
      const access = await refreshAccessToken(stored.tokens.refresh);
      saveStoredAdminAuth({
        tokens: { access, refresh: stored.tokens.refresh },
        user: stored.user,
      });
      response = await doFetch(access);
    } catch {
      clearStoredAdminAuth();
      throw new Error("نشست شما منقضی شده است. دوباره وارد شوید.");
    }
  }
  return response;
}

export function buildQuery(params: object): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(
    params as Record<string, unknown>,
  )) {
    if (value === undefined || value === "") continue;
    usp.set(key, String(value));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

export function buildFormData(
  fields: object,
  file?: File | null,
  fileKey = "image",
): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(
    fields as Record<string, unknown>,
  )) {
    if (value === undefined) continue;
    if (value === null) {
      form.append(key, "");
      continue;
    }
    if (typeof value === "object") {
      form.append(key, JSON.stringify(value));
      continue;
    }
    form.append(key, String(value));
  }
  if (file) form.append(fileKey, file);
  return form;
}

export async function parseOrThrow<T>(
  response: Response,
  fallback: string,
): Promise<T> {
  if (!response.ok) throw await readFieldError(response, fallback);
  return response.json() as Promise<T>;
}

async function throwIfError(
  response: Response,
  fallback: string,
): Promise<void> {
  if (!response.ok) throw new Error(await readErrorDetail(response, fallback));
}

// ---------------------------------------------------------------------------
// Orders (§6)
// ---------------------------------------------------------------------------

export interface OrderListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  readyWithoutSerial?: string;
}

export async function listOrders(
  params: OrderListParams,
): Promise<PaginatedResponse<AdminOrder>> {
  const res = await authorizedFetch(`/orders/${buildQuery(params)}`);
  return parseOrThrow(res, "دریافت سفارش‌ها ناموفق بود.");
}

export async function getOrder(id: string): Promise<AdminOrder> {
  const res = await authorizedFetch(`/orders/${id}/`);
  return parseOrThrow(res, "دریافت سفارش ناموفق بود.");
}

/** F-01 §۳ — یک مسیر برای همه‌ی گذارهای دستی؛ SHIPPED شرکت ارسال و کد رهگیری می‌خواهد. */
export async function transitionOrder(
  id: string,
  body: {
    to: string;
    note?: string;
    provider?: string;
    trackingNumber?: string;
  },
): Promise<AdminOrder> {
  const res = await authorizedFetch(`/orders/${id}/transition/`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error(
      await readErrorDetail(res, "تغییر وضعیت سفارش ناموفق بود."),
    );
  return res.json();
}

export async function saveOrderSerials(
  id: string,
  units: { id: number; serialNumber: string }[],
): Promise<AdminOrder> {
  const res = await authorizedFetch(`/orders/${id}/serials/`, {
    method: "POST",
    body: JSON.stringify({ units }),
  });
  if (!res.ok)
    throw new Error(await readErrorDetail(res, "ثبت سریال ناموفق بود."));
  return res.json();
}

export async function reviewReceipt(
  receiptId: number,
  decision: "APPROVE" | "REJECT",
  rejectionReason = "",
): Promise<void> {
  const res = await authorizedFetch(`/payments/receipts/${receiptId}/`, {
    method: "PATCH",
    body: JSON.stringify(
      decision === "APPROVE" ? { decision } : { decision, rejectionReason },
    ),
  });
  if (!res.ok)
    throw new Error(await readErrorDetail(res, "بررسی رسید ناموفق بود."));
}

/** فایل رسید فقط از مسیر احراز‌شده — بلاب با توکن گرفته و در زبانه‌ی جدید باز می‌شود. */
export async function openReceiptFile(receiptId: number): Promise<void> {
  const res = await authorizedFetch(`/payments/receipts/${receiptId}/file/`);
  if (!res.ok)
    throw new Error(await readErrorDetail(res, "دریافت فایل رسید ناموفق بود."));
  const url = URL.createObjectURL(await res.blob());
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export type OrderDocumentKind =
  "invoice" | "packing-slip" | "shipping-label" | "warranty-cards";

async function downloadPdf(path: string, filename: string): Promise<void> {
  const res = await authorizedFetch(path);
  if (!res.ok)
    throw new Error(await readErrorDetail(res, "دریافت فایل ناموفق بود."));
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const downloadOrderDocument = (
  id: string,
  kind: OrderDocumentKind,
  orderNumber: string,
) => downloadPdf(`/orders/${id}/${kind}.pdf`, `${kind}-${orderNumber}.pdf`);

export const downloadDailyShippingList = (date?: string) =>
  downloadPdf(
    `/orders/daily-shipping-list.pdf${date ? `?date=${date}` : ""}`,
    `daily-shipping-list-${date ?? "today"}.pdf`,
  );

// ---------------------------------------------------------------------------
// Settings (§12)
// ---------------------------------------------------------------------------

export async function getSiteSettings(): Promise<AdminSiteSettings> {
  const res = await authorizedFetch("/settings/site/");
  return parseOrThrow(res, "دریافت تنظیمات ناموفق بود.");
}

export async function updateSiteSettings(
  data: Partial<AdminSiteSettings>,
  imageFiles?: Partial<
    Record<
      | "trustBadgeImage"
      | "paymentGatewayImage"
      | "logoLight"
      | "logoDark"
      | "favicon"
      | "defaultOgImage",
      File
    >
  >,
): Promise<AdminSiteSettings> {
  const hasFiles = imageFiles && Object.values(imageFiles).some(Boolean);
  let init: RequestInit;
  if (hasFiles) {
    const form = buildFormData(data);
    for (const [key, file] of Object.entries(imageFiles ?? {})) {
      if (file) form.append(key, file);
    }
    init = { method: "PATCH", body: form };
  } else {
    init = { method: "PATCH", body: JSON.stringify(data) };
  }
  const res = await authorizedFetch("/settings/site/", init);
  return parseOrThrow(res, "ذخیره تنظیمات ناموفق بود.");
}

export async function sendTestSms(
  phone: string,
): Promise<{ status: string; error: string }> {
  const res = await authorizedFetch("/settings/credentials/test-sms/", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
  if (!res.ok)
    throw new Error(
      await readErrorDetail(res, "ارسال پیامک آزمایشی ناموفق بود."),
    );
  return res.json();
}

export async function listSmsTemplates(): Promise<SmsTemplate[]> {
  const res = await authorizedFetch("/settings/sms-templates/");
  return parseOrThrow(res, "دریافت قالب‌های پیامک ناموفق بود.");
}

export async function updateSmsTemplate(
  id: string,
  data: Partial<Pick<SmsTemplate, "isActive" | "kavenegarTemplateName">>,
): Promise<SmsTemplate> {
  const res = await authorizedFetch(`/settings/sms-templates/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return parseOrThrow(res, "ذخیره‌ی قالب پیامک ناموفق بود.");
}

export async function listSmsLogs(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  phone?: string;
  template?: string;
}): Promise<PaginatedResponse<SmsLog>> {
  const res = await authorizedFetch(`/settings/sms-logs/${buildQuery(params)}`);
  return parseOrThrow(res, "دریافت گزارش پیامک‌ها ناموفق بود.");
}

export async function listCredentials(): Promise<ApiCredential[]> {
  const res = await authorizedFetch("/settings/credentials/");
  return parseOrThrow(res, "دریافت کلیدهای API ناموفق بود.");
}

export async function createCredential(data: {
  service: ApiCredentialService;
  label: string;
  isActive: boolean;
  isSandbox: boolean;
  order: number;
  credentials: Record<string, string>;
}): Promise<ApiCredential> {
  const res = await authorizedFetch("/settings/credentials/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return parseOrThrow(res, "افزودن کلید ناموفق بود.");
}

export async function updateCredential(
  id: string,
  data: Partial<{
    label: string;
    isActive: boolean;
    isSandbox: boolean;
    order: number;
    credentials: Record<string, string>;
  }>,
): Promise<ApiCredential> {
  const res = await authorizedFetch(`/settings/credentials/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return parseOrThrow(res, "ویرایش کلید ناموفق بود.");
}

export async function deleteCredential(id: string): Promise<void> {
  const res = await authorizedFetch(`/settings/credentials/${id}/`, {
    method: "DELETE",
  });
  await throwIfError(res, "حذف کلید ناموفق بود.");
}

export async function listShippingMethods(): Promise<ShippingMethod[]> {
  const res = await authorizedFetch("/settings/shipping-methods/");
  return parseOrThrow(res, "دریافت روش‌های ارسال ناموفق بود.");
}

export async function createShippingMethod(
  data: Omit<ShippingMethod, "id">,
): Promise<ShippingMethod> {
  const res = await authorizedFetch("/settings/shipping-methods/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return parseOrThrow(res, "افزودن روش ارسال ناموفق بود.");
}

export async function updateShippingMethod(
  id: string,
  data: Partial<Omit<ShippingMethod, "id">>,
): Promise<ShippingMethod> {
  const res = await authorizedFetch(`/settings/shipping-methods/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return parseOrThrow(res, "ویرایش روش ارسال ناموفق بود.");
}

export async function deleteShippingMethod(id: string): Promise<void> {
  const res = await authorizedFetch(`/settings/shipping-methods/${id}/`, {
    method: "DELETE",
  });
  await throwIfError(res, "حذف روش ارسال ناموفق بود.");
}

// ---------------------------------------------------------------------------
// Users (§9)
// ---------------------------------------------------------------------------

export interface UserListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  isVerified?: string;
}

export async function listUsers(
  params: UserListParams,
): Promise<PaginatedResponse<AdminUserListItem>> {
  const res = await authorizedFetch(`/users/${buildQuery(params)}`);
  return parseOrThrow(res, "دریافت کاربران ناموفق بود.");
}

export async function getUser(id: string): Promise<AdminUser> {
  const res = await authorizedFetch(`/users/${id}/`);
  return parseOrThrow(res, "دریافت کاربر ناموفق بود.");
}

export async function createUser(
  data: CreateUserFormValues,
): Promise<AdminUser> {
  const res = await authorizedFetch("/users/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return parseOrThrow(res, "ایجاد کاربر ناموفق بود.");
}

export async function updateUser(
  id: string,
  data: Partial<UpdateUserFormValues>,
): Promise<AdminUser> {
  const res = await authorizedFetch(`/users/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return parseOrThrow(res, "ویرایش کاربر ناموفق بود.");
}

export async function listUserAddresses(
  userId: string,
): Promise<AdminAddress[]> {
  const res = await authorizedFetch(`/users/${userId}/addresses/`);
  return parseOrThrow(res, "دریافت آدرس‌ها ناموفق بود.");
}

// ---------------------------------------------------------------------------
// Messages (§10)
// ---------------------------------------------------------------------------

export interface MessageListParams {
  page?: number;
  pageSize?: number;
  isRead?: string;
  subject?: string;
}

export async function listMessages(
  params: MessageListParams,
): Promise<PaginatedResponse<AdminContactMessage>> {
  const res = await authorizedFetch(`/messages/${buildQuery(params)}`);
  return parseOrThrow(res, "دریافت پیام‌ها ناموفق بود.");
}

export async function getMessage(id: string): Promise<AdminContactMessage> {
  const res = await authorizedFetch(`/messages/${id}/`);
  return parseOrThrow(res, "دریافت پیام ناموفق بود.");
}

export async function updateMessage(
  id: string,
  data: Partial<{ isRead: boolean; adminNote: string }>,
): Promise<AdminContactMessage> {
  const res = await authorizedFetch(`/messages/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return parseOrThrow(res, "ویرایش پیام ناموفق بود.");
}

// ---------------------------------------------------------------------------
// Reviews (§14)
// ---------------------------------------------------------------------------

export interface ReviewListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  product?: string;
}

export async function listReviews(
  params: ReviewListParams,
): Promise<PaginatedResponse<AdminProductReview>> {
  const res = await authorizedFetch(`/reviews/${buildQuery(params)}`);
  return parseOrThrow(res, "دریافت نظرات ناموفق بود.");
}

export async function updateReview(
  id: string,
  data: Partial<{ status: ReviewStatus; adminReply: string }>,
): Promise<AdminProductReview> {
  const res = await authorizedFetch(`/reviews/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return parseOrThrow(res, "ذخیره نظر ناموفق بود.");
}

// ---------------------------------------------------------------------------
// Returns (bonus §)
// ---------------------------------------------------------------------------

export async function listReturns(params: {
  page?: number;
  pageSize?: number;
  status?: string;
}): Promise<PaginatedResponse<AdminReturn>> {
  const res = await authorizedFetch(`/returns/${buildQuery(params)}`);
  return parseOrThrow(res, "دریافت مرجوعی‌ها ناموفق بود.");
}

export async function listActivityLog(params: {
  page?: number;
  pageSize?: number;
  model?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<PaginatedResponse<AdminActivityLogEntry>> {
  const res = await authorizedFetch(`/activity-log/${buildQuery(params)}`);
  return parseOrThrow(res, "دریافت گزارش فعالیت ناموفق بود.");
}

async function returnTransition(
  id: string,
  action: string,
  body?: unknown,
): Promise<AdminReturn> {
  const res = await authorizedFetch(`/returns/${id}/${action}/`, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error(await readErrorDetail(res, "عملیات ناموفق بود."));
  return res.json();
}

/** F-04 — تصمیم قلم‌به‌قلم؛ اگر همه رد شوند، سرور کل درخواست را رد می‌کند. */
export const decideReturn = (
  id: string,
  items: { id: number; approved: boolean }[],
  adminNote: string,
) => returnTransition(id, "approve", { items, adminNote });
export const markReturnReceived = (id: string) =>
  returnTransition(id, "mark-received");
export const markReturnRefunded = (id: string) =>
  returnTransition(id, "mark-refunded");

// ---------------------------------------------------------------------------
// Coupons (bonus §)
// ---------------------------------------------------------------------------

export async function listCoupons(params: {
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<AdminCoupon>> {
  const res = await authorizedFetch(`/coupons/${buildQuery(params)}`);
  return parseOrThrow(res, "دریافت کوپن‌ها ناموفق بود.");
}

export async function createCoupon(
  data: CouponFormValues,
): Promise<AdminCoupon> {
  const res = await authorizedFetch("/coupons/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return parseOrThrow(res, "ایجاد کوپن ناموفق بود.");
}

export async function updateCoupon(
  id: string,
  data: CouponFormValues,
): Promise<AdminCoupon> {
  const res = await authorizedFetch(`/coupons/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return parseOrThrow(res, "ویرایش کوپن ناموفق بود.");
}

export async function deleteCoupon(id: string): Promise<void> {
  const res = await authorizedFetch(`/coupons/${id}/`, { method: "DELETE" });
  await throwIfError(res, "حذف کوپن ناموفق بود.");
}

// ---------------------------------------------------------------------------
// Blog (bonus §)
// ---------------------------------------------------------------------------

export async function listBlogPosts(params: {
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<AdminBlogPost>> {
  const res = await authorizedFetch(`/blog/${buildQuery(params)}`);
  return parseOrThrow(res, "دریافت مطالب بلاگ ناموفق بود.");
}

function buildBlogPayload(data: BlogPostFormValues) {
  return {
    ...data,
    tags: data.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  };
}

export async function createBlogPost(
  data: BlogPostFormValues,
  coverImage?: File | null,
): Promise<AdminBlogPost> {
  const init: RequestInit = coverImage
    ? {
        method: "POST",
        body: buildFormData(buildBlogPayload(data), coverImage, "coverImage"),
      }
    : { method: "POST", body: JSON.stringify(buildBlogPayload(data)) };
  const res = await authorizedFetch("/blog/", init);
  return parseOrThrow(res, "ایجاد مطلب بلاگ ناموفق بود.");
}

export async function updateBlogPost(
  id: string,
  data: BlogPostFormValues,
  coverImage?: File | null,
): Promise<AdminBlogPost> {
  const init: RequestInit = coverImage
    ? {
        method: "PATCH",
        body: buildFormData(buildBlogPayload(data), coverImage, "coverImage"),
      }
    : { method: "PATCH", body: JSON.stringify(buildBlogPayload(data)) };
  const res = await authorizedFetch(`/blog/${id}/`, init);
  return parseOrThrow(res, "ویرایش مطلب بلاگ ناموفق بود.");
}

export async function deleteBlogPost(id: string): Promise<void> {
  const res = await authorizedFetch(`/blog/${id}/`, { method: "DELETE" });
  await throwIfError(res, "حذف مطلب بلاگ ناموفق بود.");
}

// ---------------------------------------------------------------------------
// Sales reports (§11)
// ---------------------------------------------------------------------------

export interface ReportDateRange {
  from?: string;
  to?: string;
}

export async function getSalesReport(
  params: ReportDateRange & { groupBy?: ReportGroupBy },
): Promise<SalesReport> {
  const res = await authorizedFetch(`/reports/sales/${buildQuery(params)}`);
  return parseOrThrow(res, "دریافت گزارش فروش ناموفق بود.");
}

export async function downloadSalesReportExport(
  params: ReportDateRange & { groupBy?: ReportGroupBy },
): Promise<void> {
  const res = await authorizedFetch(
    `/reports/sales/export/${buildQuery({ ...params, format: "xlsx" })}`,
  );
  if (!res.ok)
    throw new Error(await readErrorDetail(res, "خروجی اکسل ناموفق بود."));
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sales-report.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function getTopProductsReport(
  params: ReportDateRange & { by?: TopProductsBy },
): Promise<TopProductRow[]> {
  const res = await authorizedFetch(
    `/reports/top-products/${buildQuery(params)}`,
  );
  return parseOrThrow(res, "دریافت گزارش پرفروش‌ترین‌ها ناموفق بود.");
}

export async function getByCategoryReport(
  params: ReportDateRange,
): Promise<ByCategoryRow[]> {
  const res = await authorizedFetch(
    `/reports/by-category/${buildQuery(params)}`,
  );
  return parseOrThrow(res, "دریافت گزارش دسته‌بندی‌ها ناموفق بود.");
}

export async function getConversionReport(
  params: ReportDateRange,
): Promise<ConversionReport> {
  const res = await authorizedFetch(
    `/reports/conversion/${buildQuery(params)}`,
  );
  return parseOrThrow(res, "دریافت گزارش نرخ تبدیل ناموفق بود.");
}

export async function getAbandonedCartsReport(
  params: ReportDateRange,
): Promise<AbandonedCartsReport> {
  const res = await authorizedFetch(
    `/reports/abandoned-carts/${buildQuery(params)}`,
  );
  return parseOrThrow(res, "دریافت گزارش سبدهای رهاشده ناموفق بود.");
}

export async function getCustomersReport(
  params: ReportDateRange,
): Promise<CustomersReport> {
  const res = await authorizedFetch(`/reports/customers/${buildQuery(params)}`);
  return parseOrThrow(res, "دریافت گزارش مشتریان ناموفق بود.");
}

export async function getByGatewayReport(
  params: ReportDateRange,
): Promise<ByGatewayRow[]> {
  const res = await authorizedFetch(
    `/reports/by-gateway/${buildQuery(params)}`,
  );
  return parseOrThrow(res, "دریافت گزارش درگاه‌های پرداخت ناموفق بود.");
}

export async function getReturnRateReport(
  params: ReportDateRange,
): Promise<ReturnRateReport> {
  const res = await authorizedFetch(
    `/reports/return-rate/${buildQuery(params)}`,
  );
  return parseOrThrow(res, "دریافت گزارش نرخ مرجوعی ناموفق بود.");
}

export async function getGrossMarginReport(
  params: ReportDateRange,
): Promise<GrossMarginReport> {
  const res = await authorizedFetch(
    `/reports/gross-margin/${buildQuery(params)}`,
  );
  return parseOrThrow(res, "دریافت گزارش حاشیه سود ناموفق بود.");
}

// ---------------------------------------------------------------------------
// Dashboard (§1)
// ---------------------------------------------------------------------------

export async function getDashboard(): Promise<DashboardSummary> {
  const res = await authorizedFetch("/dashboard/");
  return parseOrThrow(res, "دریافت داشبورد ناموفق بود.");
}

export async function markDashboardSeen(): Promise<{
  lastDashboardVisit: string;
}> {
  const res = await authorizedFetch("/dashboard/mark-seen/", {
    method: "POST",
  });
  return parseOrThrow(res, "ثبت بازدید ناموفق بود.");
}

// ---------------------------------------------------------------------------
// Search Console (§4 bonus)
// ---------------------------------------------------------------------------

/** Every search-console endpoint returns 503 until the client sets up Google
 * Search Console credentials and the nightly sync runs at least once — that
 * is a normal "not connected" state, not an error, so it resolves to null
 * instead of throwing. Any other non-2xx status still throws normally. */
async function fetchSearchConsole<T>(
  path: string,
  fallback: string,
): Promise<T | null> {
  const res = await authorizedFetch(path);
  if (res.status === 503) return null;
  return parseOrThrow<T>(res, fallback);
}

export async function getSearchConsolePerformance(
  params: ReportDateRange,
): Promise<SearchConsolePerformance | null> {
  return fetchSearchConsole(
    `/search-console/performance/${buildQuery(params)}`,
    "دریافت عملکرد سرچ کنسول ناموفق بود.",
  );
}

export async function getSearchConsoleQueries(
  params: ReportDateRange,
): Promise<SearchConsoleQueryRow[] | null> {
  return fetchSearchConsole(
    `/search-console/queries/${buildQuery(params)}`,
    "دریافت عبارت‌های جستجو ناموفق بود.",
  );
}

export async function getSearchConsolePages(
  params: ReportDateRange,
): Promise<SearchConsolePageRow[] | null> {
  return fetchSearchConsole(
    `/search-console/pages/${buildQuery(params)}`,
    "دریافت صفحات ناموفق بود.",
  );
}

export async function getSearchConsoleIndexStatus(): Promise<SearchConsoleIndexStatus | null> {
  return fetchSearchConsole(
    "/search-console/index-status/",
    "دریافت وضعیت ایندکس ناموفق بود.",
  );
}

export async function getSearchConsoleSitemapStatus(): Promise<SearchConsoleSitemapStatus | null> {
  return fetchSearchConsole(
    "/search-console/sitemap-status/",
    "دریافت وضعیت سایت‌مپ ناموفق بود.",
  );
}

// ---------------------------------------------------------------------------
// Roles & permissions (§7.5)
// ---------------------------------------------------------------------------

export async function listRoles(): Promise<AdminRole[]> {
  const res = await authorizedFetch("/roles/");
  return parseOrThrow(res, "دریافت نقش‌ها ناموفق بود.");
}

export async function listSections(): Promise<AdminSection[]> {
  const res = await authorizedFetch("/roles/sections/");
  return parseOrThrow(res, "دریافت فهرست بخش‌ها ناموفق بود.");
}

export async function createRole(
  data: AdminRoleFormValues,
): Promise<AdminRole> {
  const res = await authorizedFetch("/roles/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return parseOrThrow(res, "ایجاد نقش ناموفق بود.");
}

export async function updateRole(
  id: string,
  data: Partial<AdminRoleFormValues>,
): Promise<AdminRole> {
  const res = await authorizedFetch(`/roles/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return parseOrThrow(res, "ویرایش نقش ناموفق بود.");
}

export async function deleteRole(id: string): Promise<void> {
  const res = await authorizedFetch(`/roles/${id}/`, { method: "DELETE" });
  await throwIfError(res, "حذف نقش ناموفق بود.");
}

export async function getMyPermissions(): Promise<MyPermissions> {
  const res = await authorizedFetch("/me/permissions/");
  return parseOrThrow(res, "دریافت مجوزها ناموفق بود.");
}

// ---------------------------------------------------------------------------
// Password management (§7.6) — all superuser-only server-side
// ---------------------------------------------------------------------------

export async function resetPassword(
  userId: string,
): Promise<ResetPasswordResponse> {
  const res = await authorizedFetch(`/users/${userId}/reset-password/`, {
    method: "POST",
  });
  return parseOrThrow(res, "بازنشانی رمز ناموفق بود.");
}

export async function impersonateUser(
  userId: string,
): Promise<ImpersonateResponse> {
  const res = await authorizedFetch(`/users/${userId}/impersonate/`, {
    method: "POST",
  });
  return parseOrThrow(res, "ورود به‌جای کاربر ناموفق بود.");
}

export async function forceLogout(
  userId: string,
): Promise<ForceLogoutResponse> {
  const res = await authorizedFetch(`/users/${userId}/force-logout/`, {
    method: "POST",
  });
  return parseOrThrow(res, "خروج اجباری ناموفق بود.");
}

export async function changeOwnPassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const res = await authorizedFetch("/auth/change-password/", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  await throwIfError(res, "تغییر رمز عبور ناموفق بود.");
}
export { listCategories, listProducts } from "@/lib/catalogApi";

// G-01 — متن‌های «درباره ما» و اسناد «قوانین».
export async function getAboutPageContent(): Promise<AboutPageContent> {
  return parseOrThrow(
    await authorizedFetch("/pages/about/"),
    "دریافت متن درباره ما ناموفق بود.",
  );
}

export async function updateAboutPageContent(
  data: AboutPageContent,
): Promise<AboutPageContent> {
  const res = await authorizedFetch("/pages/about/", {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return parseOrThrow(res, "ذخیره‌ی متن درباره ما ناموفق بود.");
}

export async function listLegalDocuments(): Promise<LegalDocumentContent[]> {
  return parseOrThrow(
    await authorizedFetch("/pages/legal/"),
    "دریافت اسناد ناموفق بود.",
  );
}

export async function updateLegalDocument(
  key: string,
  data: { title: string; body: string },
): Promise<LegalDocumentContent> {
  const res = await authorizedFetch(`/pages/legal/${key}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return parseOrThrow(res, "ذخیره‌ی سند ناموفق بود.");
}

// G-02 — ریدایرکت‌ها.
export async function listRedirects(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  isAuto?: string;
}): Promise<PaginatedResponse<AdminRedirect>> {
  return parseOrThrow(
    await authorizedFetch(`/redirects/${buildQuery(params)}`),
    "دریافت ریدایرکت‌ها ناموفق بود.",
  );
}

export async function saveRedirect(
  id: number | null,
  data: RedirectFormValues,
): Promise<AdminRedirect> {
  const res = await authorizedFetch(id ? `/redirects/${id}/` : "/redirects/", {
    method: id ? "PATCH" : "POST",
    body: JSON.stringify(data),
  });
  return parseOrThrow(res, "ذخیره‌ی ریدایرکت ناموفق بود.");
}

export async function deleteRedirect(id: number): Promise<void> {
  const res = await authorizedFetch(`/redirects/${id}/`, { method: "DELETE" });
  if (!res.ok) throw new Error("حذف ریدایرکت ناموفق بود.");
}

// G-03 — لاگ ورود پنل.
export interface AdminLoginAttempt {
  id: number;
  phone: string;
  ipAddress: string | null;
  userAgent: string;
  success: boolean;
  reason: string;
  userName: string | null;
  createdAt: string;
}

export async function listLoginAttempts(params: {
  page?: number;
  pageSize?: number;
  success?: string;
}): Promise<PaginatedResponse<AdminLoginAttempt>> {
  return parseOrThrow(
    await authorizedFetch(`/login-attempts/${buildQuery(params)}`),
    "دریافت لاگ ورود ناموفق بود.",
  );
}
