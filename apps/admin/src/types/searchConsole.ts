export interface SearchConsolePerformanceRow {
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
  avgPosition: number;
}

export interface SearchConsolePerformance {
  impressions: number;
  clicks: number;
  ctr: number;
  avgPosition: number;
  series: SearchConsolePerformanceRow[];
}

export interface SearchConsoleQueryRow {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

export interface SearchConsolePageRow {
  page: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

export interface SearchConsoleIndexStatus {
  indexedCount: number;
  errorCount: number;
  issues: { page: string; reason: string }[];
}

export interface SearchConsoleSitemapStatus {
  lastReadAt: string | null;
  discoveredUrls: number;
}
