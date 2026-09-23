import type { Availability } from "@arbyte/contracts";

/**
 * §۷.۳۸/T-003-DECISION — وضعیت موجودی مشتق‌شده است، نه ستون دیتابیس:
 * quantity/reservedQuantity (→ availableQuantity، ستون GENERATED) +
 * lowStockThreshold سطر (اگر نال بود، آستانه‌ی سراسری `Setting`). T-150 —
 * isPreorder روی ProductVariant صرف‌نظر از موجودی همیشه PREORDER برمی‌گرداند
 * (تصمیم مدیر پروژه، ر.ک. schema/02-catalog.prisma).
 */
export function computeAvailability(
  inventory: {
    quantity: number;
    reservedQuantity: number;
    availableQuantity: number | null;
    lowStockThreshold: number | null;
  } | null,
  isPreorder: boolean,
  globalLowStockThreshold: number,
): Availability {
  if (isPreorder) return { status: "PREORDER" };

  const available =
    inventory?.availableQuantity ??
    (inventory ? inventory.quantity - inventory.reservedQuantity : 0);

  if (available <= 0) return { status: "OUT_OF_STOCK" };

  const threshold = inventory?.lowStockThreshold ?? globalLowStockThreshold;
  if (available <= threshold) {
    return { status: "LOW_STOCK", quantity: available };
  }
  return { status: "IN_STOCK" };
}
