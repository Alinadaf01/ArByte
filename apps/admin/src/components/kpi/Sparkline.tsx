interface SparklineProps {
  id: string;
  values: number[];
  /** توکن رنگ سمنتیک برای stroke/fill — از currentColor استفاده می‌کند، پس روی عنصر والد با text-* تنظیم شود. */
  className?: string;
}

/**
 * نمودار روند کوچک — تزئینی/مکمل است، نه منبع اطلاعات. مقدار و درصد تغییر
 * به‌صورت متن واقعی در KpiTile نمایش داده می‌شوند (طبق راهنمای دسترس‌پذیری:
 * هرگز فقط با رنگ/نمودار معنا منتقل نشود) — برای همین aria-hidden است.
 */
export function Sparkline({ id, values, className }: SparklineProps) {
  if (values.length < 2) return null;

  const width = 120;
  const height = 32;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);

  const points = values.map((value, i) => {
    const x = i * step;
    const y = height - ((value - min) / range) * height;
    return `${x} ${y}`;
  });

  const linePath = `M${points.join(" L")}`;
  const areaPath = `${linePath} L${width} ${height} L0 ${height} Z`;
  const gradientId = `sparkline-fill-${id}`;

  return (
    <svg
      className={className}
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={linePath}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
