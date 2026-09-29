export interface InventoryRow {
  product: { id: number; name: string; sku: string };
  stockCount: number;
  reorderPoint: number | null;
  isLow: boolean;
  stockValue: number | null;
}

export interface InventorySummary {
  totalStockValue: number | null;
  lowStockCount: number;
}

export type StockMovementType =
  "purchase" | "production" | "sale" | "return_in" | "adjustment" | "scrap";
export type ManualStockMovementType =
  "purchase" | "production" | "adjustment" | "scrap";

export const STOCK_MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  purchase: "خرید",
  production: "تولید",
  sale: "فروش",
  return_in: "بازگشت",
  adjustment: "اصلاح",
  scrap: "ضایعات",
};

export const MANUAL_STOCK_MOVEMENT_TYPES: ManualStockMovementType[] = [
  "purchase",
  "production",
  "adjustment",
  "scrap",
];

export interface StockMovement {
  id: string;
  product: number;
  type: StockMovementType;
  quantity: number;
  balanceAfter: number;
  reference: string;
  note: string;
  user: string | null;
  createdAt: string;
}

export interface CreateStockMovementValues {
  productId: number | null;
  type: ManualStockMovementType;
  quantity: number;
  note: string;
}
