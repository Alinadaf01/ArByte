export type CouponType = "percent" | "fixed";

export interface AdminCoupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  minOrderValue: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  perUserLimit: number | null;
  startsAt: string | null;
  endsAt: string | null;
  categories: number[];
  products: number[];
  isActive: boolean;
}

export interface CouponFormValues {
  code: string;
  type: CouponType;
  value: number;
  minOrderValue: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  startsAt: string | null;
  endsAt: string | null;
  categories: number[];
  products: number[];
  isActive: boolean;
}
