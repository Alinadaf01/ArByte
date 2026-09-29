export type ReportGroupBy = "day" | "week" | "month";
export type TopProductsBy = "quantity" | "revenue";

export interface SalesReportRow {
  period: string;
  total: number;
  orderCount: number;
}

export interface SalesReport {
  series: SalesReportRow[];
  averageOrderValue: number;
}

export interface TopProductRow {
  product: { id: number; name: string; sku: string };
  unitsSold: number;
  revenue: number;
}

export interface ByCategoryRow {
  category: { id: number | null; name: string | null };
  total: number;
  orderCount: number;
}

export interface ConversionReport {
  cartsCreated: number;
  ordersPaid: number;
  rate: number;
}

export interface AbandonedCartsReport {
  cartsCreated: number;
  cartsAbandoned: number;
  rate: number;
}

export interface CustomersReport {
  newCustomers: number;
  returningCustomers: number;
}

export interface ByGatewayRow {
  gateway: string;
  total: number;
  orderCount: number;
}

export interface ReturnRateReport {
  ordersDelivered: number;
  ordersReturned: number;
  rate: number;
}

export interface GrossMarginReport {
  revenue: number;
  cost: number;
  margin: number;
  coveragePercent: number;
}
