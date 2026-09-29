export interface ProductPriceRow {
  id: string;
  name: string;
  sku: string;
  category: number;
  price: number;
}

export type BulkPriceEditMode = "percent" | "fixed" | "set";
export type BulkPriceEditDirection = "increase" | "decrease";

export interface BulkPriceEditInput {
  productIds: number[];
  mode: BulkPriceEditMode;
  direction?: BulkPriceEditDirection;
  value: number;
  roundToNearest1000?: boolean;
  reason?: string;
}

export interface PriceChange {
  productId: number;
  name: string;
  oldPrice: number;
  newPrice: number;
}

export interface PriceHistoryEntry {
  id: string;
  oldPrice: number;
  newPrice: number;
  changedBy: string;
  reason: string;
  createdAt: string;
}
