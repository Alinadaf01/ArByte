export type ReviewStatus = "pending" | "approved" | "rejected";

export interface AdminProductReview {
  id: string;
  product: number;
  user: string | null;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  adminReply: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: "در انتظار",
  approved: "تأییدشده",
  rejected: "ردشده",
};
