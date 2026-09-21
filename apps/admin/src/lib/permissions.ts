export type Permission =
  | "orders.view"
  | "payments.view"
  | "shipping.view"
  | "returns.view"
  | "products.view"
  | "categories.view"
  | "specifications.view"
  | "inventory.view"
  | "brands.view"
  | "users.view"
  | "reviews.view"
  | "messages.view"
  | "campaigns.view"
  | "coupons.view"
  | "blog.view"
  | "seo.view"
  | "roles.view"
  | "settings.view"
  | "notifications.view"
  | "logs.view";

/**
 * تا زمانی که RBAC واقعی (بند ۱۱.۱۷–۱۱.۲۴ برند بوک) با نشست ادمین واقعی
 * بیاید، همه‌ی دسترسی‌ها باز فرض می‌شوند تا پوسته قابل‌استفاده باشد.
 * Permission-Aware UI (بند ۵.۸۳): آیتم بدون مجوز باید حذف شود، نه غیرفعال —
 * `Sidebar` همین حالا از این تابع برای فیلتر کردن استفاده می‌کند؛ وقتی نشست
 * واقعی وصل شد، فقط بدنه‌ی این تابع عوض می‌شود.
 */
export function hasPermission(_permission: Permission): boolean {
  return true;
}
