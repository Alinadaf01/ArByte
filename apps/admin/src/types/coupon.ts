/** F-04 — کوپن آربایت (content.Coupon، طبق Prisma): درصد به basis points. */
export type CouponType = "PERCENT" | "AMOUNT";

export interface AdminCoupon {
  id: string;
  code: string;
  type: CouponType;
  amountToman: number | null;
  percentBasisPoints: number | null;
  minimumOrderAmount: number | null;
  maximumDiscountAmount: number | null;
  usageLimit: number | null;
  usedCount: number;
  totalDiscount: number;
  uniqueUsers: number;
  perUserLimit: number | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}

export type CouponFormValues = Omit<
  AdminCoupon,
  "id" | "usedCount" | "totalDiscount" | "uniqueUsers"
>;
