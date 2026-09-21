import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { Sparkline } from "./Sparkline";

interface KpiTileProps {
  id: string;
  label: string;
  /** از قبل فرمت‌شده (ارقام فارسی، جداکننده‌ی درست) — این کامپوننت محاسبه یا فرمت نمی‌کند. */
  value: string;
  deltaLabel: string;
  trend: "up" | "down";
  icon: LucideIcon;
  sparklineValues: number[];
}

export function KpiTile({
  id,
  label,
  value,
  deltaLabel,
  trend,
  icon: Icon,
  sparklineValues,
}: KpiTileProps) {
  const TrendIcon = trend === "up" ? TrendingUp : TrendingDown;
  const trendColor = trend === "up" ? "text-success-text" : "text-danger";

  return (
    <article className="bg-surface shadow-card rounded-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-caption text-micro font-medium">{label}</p>
          <p
            className="text-primary mt-2 text-h2 font-heading"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {value}
          </p>
          {/* bg-surface-muted + text-success-text فقط ۴.۳:۱ می‌دهد (کمتر از آستانه‌ی AA
              برای متن) — bg-surface + حاشیه با هر دو رنگ >۴.۹:۱ است. */}
          <span
            className={`bg-surface border-border mt-2 inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-micro font-emphasis ${trendColor}`}
          >
            <TrendIcon size={13} aria-hidden="true" />
            {deltaLabel}
          </span>
        </div>
        <div className="bg-brand-tint-1 text-brand flex h-12 w-12 shrink-0 items-center justify-center rounded-tile sm:h-14 sm:w-14">
          <Icon size={24} aria-hidden="true" />
        </div>
      </div>
      <Sparkline
        id={id}
        values={sparklineValues}
        className="text-brand mt-4 h-8 w-full"
      />
    </article>
  );
}
