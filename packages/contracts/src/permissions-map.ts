/**
 * نقشه‌ی مجوزها — T-004 §۶ (بندهای ۱۱.۱۹، ۱۱.۸۶). هر endpoint دقیقاً یکی
 * از این سه حالت را دارد (T-004 محدودیت‌ها، مورد آخر): `"public"` (بدون
 * ورود)، `"authenticated"` (فقط ورود، بدون مجوز خاص)، یا کلید(های)
 * Permission (بند ۸.۱۱ — `domain.action`). این جدول بعداً مبنای Guardهای
 * واقعی می‌شود (T-004-next).
 *
 * `users.impersonate` (الحاقیه §۱۱) به‌صورت پیش‌فرض فقط روی نقش «مدیر
 * ارشد» seed می‌شود (T-003 seed.ts) — یعنی حتی یک مجوز معتبر دیگر هم آن
 * را جایگزین نمی‌کند مگر صریحاً به نقشی داده شود.
 */

/**
 * D-04 §۳ — `"guest-or-authenticated"`: بدون ورود با هدر X-Cart-Session
 * (سبد مهمان سمت سرور، وایب‌محور)، یا با ورود (Authorization). با
 * `"public"` فرق دارد چون سرور همیشه یک هویت سبد (مهمان یا کاربر) نیاز
 * دارد؛ با `"authenticated"` فرق دارد چون کاربر واردنشده هم مجاز است.
 */
export type EndpointAccess =
  "public" | "authenticated" | "guest-or-authenticated" | string | string[];

export interface PermissionMapEntry {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  access: EndpointAccess;
}

export const PERMISSIONS_MAP: readonly PermissionMapEntry[] = [
  // ---------- auth ----------
  { method: "POST", path: "/auth/otp/request", access: "public" },
  { method: "POST", path: "/auth/otp/verify", access: "public" },
  { method: "POST", path: "/auth/refresh", access: "public" },
  { method: "POST", path: "/auth/logout", access: "authenticated" },
  { method: "GET", path: "/auth/me", access: "authenticated" },
  /** بلیت‌محور، نه مجوزمحور — ر.ک. auth/index.ts. */
  { method: "POST", path: "/auth/impersonate/exchange", access: "public" },

  // ---------- catalog (عمومی) ----------
  { method: "GET", path: "/catalog/categories", access: "public" },
  { method: "GET", path: "/catalog/categories/:slug", access: "public" },
  { method: "GET", path: "/catalog/products", access: "public" },
  { method: "GET", path: "/catalog/products/:slug", access: "public" },
  { method: "GET", path: "/catalog/search", access: "public" },
  { method: "GET", path: "/catalog/filters", access: "public" },

  // ---------- cart ----------
  /** D-04 §۳ — قبلاً فقط authenticated بود؛ سبد مهمان سمت سرور اضافه شد. */
  { method: "GET", path: "/cart", access: "guest-or-authenticated" },
  { method: "POST", path: "/cart/items", access: "guest-or-authenticated" },
  {
    method: "PATCH",
    path: "/cart/items/:id",
    access: "guest-or-authenticated",
  },
  {
    method: "DELETE",
    path: "/cart/items/:id",
    access: "guest-or-authenticated",
  },
  /** E-02 §۳ — کوپن/روش ارسال روی سبد؛ همان الگوی سبد مهمان/کاربر. */
  { method: "POST", path: "/cart/coupon", access: "guest-or-authenticated" },
  { method: "DELETE", path: "/cart/coupon", access: "guest-or-authenticated" },
  {
    method: "PATCH",
    path: "/cart/shipping-method",
    access: "guest-or-authenticated",
  },

  // ---------- shipping / payment methods (عمومی — E-02 §۳/۴) ----------
  { method: "GET", path: "/shipping-methods", access: "public" },
  { method: "GET", path: "/payment-methods", access: "public" },

  // ---------- order ----------
  /** الحاقیه §۶ — سشن جعل‌هویت این را رد می‌کند (orders.create مسدود است). */
  { method: "POST", path: "/orders", access: "authenticated" },
  { method: "GET", path: "/orders", access: "authenticated" },
  { method: "GET", path: "/orders/:orderNumber", access: "authenticated" },
  {
    method: "POST",
    path: "/orders/:orderNumber/receipt",
    access: "authenticated",
  },
  {
    method: "GET",
    path: "/orders/:orderNumber/invoice.pdf",
    access: "authenticated",
  },
  /** E-04 §۳ — فقط مالک سفارش، فقط بعد از SHIPPED (سرور ۴۰۴ می‌دهد قبل از آن). */
  {
    method: "GET",
    path: "/orders/:orderNumber/units/:certificateId/warranty.pdf",
    access: "authenticated",
  },
  {
    method: "POST",
    path: "/orders/:orderNumber/return",
    access: "authenticated",
  },
  {
    method: "POST",
    path: "/orders/:orderNumber/payment/initiate",
    access: "authenticated",
  },
  /** D-05 §۵ — پیگیری مهمان؛ بدون ورود اما با محدودیت نرخ سخت (order_track). */
  { method: "POST", path: "/orders/track", access: "public" },

  // ---------- payment (درگاه) ----------
  /** وب‌هوک درگاه — بدون کاربر، اما باید با امضا/HMAC تأیید شود (منطق سرویس). */
  { method: "POST", path: "/payments/callback/:provider", access: "public" },
  { method: "GET", path: "/payments/return/:provider", access: "public" },

  // ---------- account ----------
  { method: "GET", path: "/account/profile", access: "authenticated" },
  { method: "PATCH", path: "/account/profile", access: "authenticated" },
  { method: "GET", path: "/account/addresses", access: "authenticated" },
  { method: "POST", path: "/account/addresses", access: "authenticated" },
  { method: "PATCH", path: "/account/addresses/:id", access: "authenticated" },
  { method: "DELETE", path: "/account/addresses/:id", access: "authenticated" },
  { method: "GET", path: "/account/wishlist", access: "authenticated" },
  { method: "POST", path: "/account/wishlist", access: "authenticated" },
  { method: "DELETE", path: "/account/wishlist/:id", access: "authenticated" },
  /** D-04 §۲ — جدید. */
  { method: "POST", path: "/account/wishlist/merge", access: "authenticated" },
  /** E-05 §۳ — جدید («دستگاه‌های من»). */
  { method: "GET", path: "/account/devices", access: "authenticated" },

  // ---------- content (عمومی) ----------
  { method: "GET", path: "/content/homepage", access: "public" },

  // ---------- admin: محصولات/برندها/دسته‌بندی/مشخصات ----------
  { method: "GET", path: "/admin/products", access: "products.view" },
  { method: "POST", path: "/admin/products", access: "products.create" },
  { method: "GET", path: "/admin/products/:id", access: "products.view" },
  { method: "PATCH", path: "/admin/products/:id", access: "products.update" },
  { method: "DELETE", path: "/admin/products/:id", access: "products.delete" },

  { method: "GET", path: "/admin/brands", access: "brands.view" },
  { method: "POST", path: "/admin/brands", access: "brands.create" },
  { method: "PATCH", path: "/admin/brands/:id", access: "brands.update" },
  { method: "DELETE", path: "/admin/brands/:id", access: "brands.delete" },

  { method: "GET", path: "/admin/categories", access: "categories.view" },
  { method: "POST", path: "/admin/categories", access: "categories.create" },
  {
    method: "PATCH",
    path: "/admin/categories/:id",
    access: "categories.update",
  },
  {
    method: "DELETE",
    path: "/admin/categories/:id",
    access: "categories.delete",
  },

  {
    method: "GET",
    path: "/admin/specifications",
    access: "specifications.view",
  },
  {
    method: "POST",
    path: "/admin/specifications",
    access: "specifications.create",
  },
  {
    method: "PATCH",
    path: "/admin/specifications/:id",
    access: "specifications.update",
  },
  {
    method: "DELETE",
    path: "/admin/specifications/:id",
    access: "specifications.delete",
  },
  /** مدیریت مقادیر یک مشخصه بخشی از مدیریت خودِ مشخصه است — مجوز جدا ندارد (T-101). */
  {
    method: "POST",
    path: "/admin/specifications/:id/values",
    access: "specifications.update",
  },
  {
    method: "PATCH",
    path: "/admin/specifications/:id/values/:valueId",
    access: "specifications.update",
  },
  {
    method: "DELETE",
    path: "/admin/specifications/:id/values/:valueId",
    access: "specifications.update",
  },

  // ---------- admin: موجودی ----------
  { method: "GET", path: "/admin/inventory", access: "inventory.view" },
  {
    method: "POST",
    path: "/admin/inventory/:variantId/adjust",
    access: "inventory.update",
  },

  // ---------- admin: سفارش‌ها ----------
  { method: "GET", path: "/admin/orders", access: "orders.view" },
  { method: "GET", path: "/admin/orders/:orderNumber", access: "orders.view" },
  {
    method: "GET",
    path: "/admin/orders/:orderNumber/history",
    access: "orders.view",
  },
  /** transitionTo (order-status.service.ts) پشت این Guard صدا زده می‌شود. */
  {
    method: "PATCH",
    path: "/admin/orders/:orderNumber/status",
    access: "orders.update",
  },

  // ---------- admin: پرداخت‌ها ----------
  { method: "GET", path: "/admin/payments", access: "payments.view" },
  { method: "GET", path: "/admin/payments/receipts", access: "payments.view" },
  {
    method: "PATCH",
    path: "/admin/payments/receipts/:id",
    access: "payments.update",
  },
  /** D-05 §۳ — فایل رسید هرگز عمومی نیست؛ فقط از این endpoint احراز‌هویت‌شده. */
  {
    method: "GET",
    path: "/admin/payments/receipts/:id/file",
    access: "payments.view",
  },

  // ---------- admin: کاربران و نقش‌ها ----------
  { method: "GET", path: "/admin/users", access: "users.view" },
  { method: "POST", path: "/admin/users", access: "users.create" },
  { method: "PATCH", path: "/admin/users/:id", access: "users.update" },
  /** الحاقیه §۱۱ — پیش‌فرض فقط سوپرادمین (seed). */
  {
    method: "POST",
    path: "/admin/users/:id/impersonate",
    access: "users.impersonate",
  },

  { method: "GET", path: "/admin/roles", access: "roles.view" },
  { method: "POST", path: "/admin/roles", access: "roles.create" },
  { method: "PATCH", path: "/admin/roles/:id", access: "roles.update" },
  { method: "DELETE", path: "/admin/roles/:id", access: "roles.delete" },

  // ---------- admin: تنظیمات ----------
  { method: "GET", path: "/admin/settings", access: "settings.view" },
  { method: "PATCH", path: "/admin/settings/:key", access: "settings.update" },

  // ---------- admin: Audit Log (فقط خواندنی — تریگر DB نوشتن را مسدود می‌کند) ----------
  { method: "GET", path: "/admin/audit-log", access: "logs.view" },

  // ---------- admin: صفحه‌ی اصلی (سند مقایسه‌ی وایب‌شاپ + الحاقیه §۸) ----------
  { method: "GET", path: "/admin/homepage/blocks", access: "content.view" },
  { method: "POST", path: "/admin/homepage/blocks", access: "content.create" },
  {
    method: "PATCH",
    path: "/admin/homepage/blocks/:id",
    access: "content.update",
  },
  {
    method: "PATCH",
    path: "/admin/homepage/blocks/reorder",
    access: "content.update",
  },
  {
    method: "DELETE",
    path: "/admin/homepage/blocks/:id",
    access: "content.delete",
  },
] as const;
