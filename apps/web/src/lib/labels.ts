import {
  condition,
  inventory,
  type Availability,
  type ProductConditionValue,
} from "@arbyte/contracts";

/**
 * T-201 §۱ — همتای apps/web برای الگوی exhaustive-map «enum-labels.ts»ِ
 * historical NestJS/Prisma code (که چون به `../../prisma/generated/prisma/client` وابسته است،
 * از apps/web قابل import نیست). منبع متن همان `@arbyte/contracts` است —
 * برچسب‌ها این‌جا نه بازنویسی و نه ترجمه‌ی مجدد می‌شوند، فقط دوباره روی
 * enum سیمی (`ProductConditionValue`/`Availability.status`) نگاشت
 * می‌شوند تا رشته‌ی مستقیم داخل کامپوننت نباشد (قانون ۲).
 */
export const CONDITION_LABEL: Record<ProductConditionValue, string> = {
  NEW: condition.sealed,
  OPEN_BOX: condition.openBox,
  STOCK: condition.stock,
  LIKE_NEW: condition.likeNew,
};

export type AvailabilityTone = "success" | "warning" | "neutral" | "info";

/** بند ۶.۲۴: موجود=success، محدود=warning، ناموجود=neutral، به‌زودی=info. */
export function availabilityTone(availability: Availability): AvailabilityTone {
  switch (availability.status) {
    case "IN_STOCK":
      return "success";
    case "LOW_STOCK":
      return "warning";
    case "OUT_OF_STOCK":
      return "neutral";
    case "PREORDER":
      return "info";
  }
}

/** بند ۲.۱۵: تعداد دقیق فقط برای LOW_STOCK («۳ عدد موجود»)، بقیه فقط برچسب. */
export function availabilityLabel(availability: Availability): string {
  switch (availability.status) {
    case "IN_STOCK":
      return inventory.inStock;
    case "LOW_STOCK":
      return inventory.exactCount(availability.quantity);
    case "OUT_OF_STOCK":
      return inventory.outOfStock;
    case "PREORDER":
      return inventory.comingSoon;
  }
}

/**
 * رنگ متن پیل موجودی کوچک (کارت محصول، Featured صفحه اصلی) — همان تن
 * `availabilityTone` اما به‌جای رنگ Badge، رنگ متن خام می‌خواهد (پیل روی
 * تصویر، نه داخل Badge کامپوننت).
 */
export const AVAILABILITY_TEXT_TONE: Record<AvailabilityTone, string> = {
  success: "text-success-text",
  warning: "text-warning",
  neutral: "text-secondary",
  info: "text-accent-deep",
};
