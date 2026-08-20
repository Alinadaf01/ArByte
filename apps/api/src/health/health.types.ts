export interface HealthIndicatorResult {
  status: "up" | "down";
  message?: string;
}
