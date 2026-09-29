import type { AdminOrder } from "@/types/order";

export interface NeedsAction {
  paidPendingProcessing: number;
  readyToShip: number;
  paymentReview: number;
  readyWithoutSerial: number;
  newReturnRequests: number;
  unreadMessages: number;
  pendingReviews: number;
  lowStockCount: number;
  outOfStockActive: number;
  stalePendingPayments: number;
}

export interface TodayPulse {
  sales: number;
  salesLastWeekSameDay: number;
  orders: number;
  ordersLastWeekSameDay: number;
  averageOrderValue: number;
  averageOrderValueLastWeekSameDay: number;
  conversionRate: number;
  conversionRateLastWeekSameDay: number;
}

export interface VisitCounts {
  pageViews: number;
  uniqueVisitors: number;
}

export interface SiteVisits {
  today: VisitCounts;
  thisMonth: VisitCounts;
  total: VisitCounts;
  topPages: { path: string; views: number }[];
  topReferrers: { referrer: string; views: number }[];
  worstViewToPurchase: {
    product: { id: number; name: string; sku: string };
    views: number;
    purchases: number;
    ratio: number;
  }[];
}

export interface DashboardProductRow {
  product: { id: string; name: string; sku: string };
  unitsSold: number;
  revenue: number;
}

export interface Trends {
  salesChart30d: { date: string; total: number }[];
  topProductsByQuantity: DashboardProductRow[];
  topProductsByRevenue: DashboardProductRow[];
  thisMonthToDate: number;
  lastMonthToDate: number;
}

export type FeedItemType =
  "order" | "user" | "review" | "message" | "return" | "activity";

export interface FeedItem {
  type: FeedItemType;
  id: string;
  summary: string;
  createdAt: string;
  link: { path: string; id: string } | null;
}

export interface SinceLastVisit {
  lastVisitAt: string | null;
  feed: FeedItem[];
}

export interface GatewayStatus {
  service: string;
  label: string;
  isActive: boolean;
  hasValidCredentials: boolean;
}

export interface StockDiscrepancy {
  product: { id: number; name: string; sku: string };
  quantity: number;
  ledgerBalance: number;
}

export interface SystemHealth {
  kavenegarCredit: number | null;
  kavenegarThresholdBreached: boolean;
  gateways: GatewayStatus[];
  paymentErrors24h: number;
  stockDiscrepancies: StockDiscrepancy[];
  sitemapLastReadAt: string | null;
  sitemapDiscoveredUrls: number;
  paidNotShippedOverThreshold: number;
}

export interface DashboardSummary {
  needsAction: NeedsAction;
  today: TodayPulse;
  siteVisits: SiteVisits;
  trends: Trends;
  sinceLastVisit: SinceLastVisit;
  systemHealth: SystemHealth;
  recentOrders: AdminOrder[];
}
