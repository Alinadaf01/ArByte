export interface MarketingAudienceUser {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  cartItemCount: number;
}

export interface MarketingCartItem {
  productName: string;
  variantLabel: string | null;
  sku: string;
  quantity: number;
  unitPrice: number;
}

export interface MarketingUserCart {
  items: MarketingCartItem[];
  updatedAt: string | null;
}

export interface MarketingCampaignResult {
  requested: number;
  matched: number;
  queued: number;
}
