import "chart.js/auto";

export const CHART_COLORS = {
  brand: "#8B6BFF",
  brandFill: "rgba(139, 107, 255, 0.15)",
  success: "#2FB66B",
  successFill: "rgba(47, 182, 107, 0.5)",
  warning: "#F4B400",
  danger: "#E86A6A",
  grid: "rgba(255, 255, 255, 0.06)",
  text: "#94A3B8",
};

// Deliberately untyped (not `ChartOptions<T>`) — Chart.js's per-type option
// generics don't structurally unify across "bar" | "line" | "pie" (the
// TooltipModel "this" parameter varies per type), so a shared, explicitly
// typed base can't be spread into any single chart's options prop. A plain
// inferred object type satisfies each call site's specific ChartOptions<T>.
export const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 800, easing: "easeOutQuart" },
  plugins: {
    legend: {
      rtl: true,
      labels: { color: CHART_COLORS.text, boxWidth: 10, boxHeight: 10 },
    },
    tooltip: {
      rtl: true,
      backgroundColor: "#161618",
      borderColor: "rgba(255,255,255,0.08)",
      borderWidth: 1,
      titleColor: "#fff",
      bodyColor: "#cbd5e1",
      padding: 10,
    },
  },
} as const;
