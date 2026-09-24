import type { SVGProps } from "react";

/**
 * T-212 §۴ — تولیدشده‌ی خودکار توسط `pnpm --filter @arbyte/web map:build`
 * (`scripts/build-iran-map.mjs`، d3-geo + topojson-client + world-atlas).
 * دستی ویرایش نکنید — دوباره اسکریپت را اجرا کنید.
 * صفر d3/topojson در این فایل — فقط مسیر SVG محاسبه‌شده و مختصات ثابت.
 */
export function IranMap(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 640 380"
      width="100%"
      height="100%"
      role="img"
      aria-label="نقشه ایران و مسیرهای ارسال آربایت از تهران"
      {...props}
    >
      <defs>
        <linearGradient id="arbIranFill" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.17} />
          <stop
            offset="100%"
            stopColor="var(--color-accent)"
            stopOpacity={0.14}
          />
        </linearGradient>
        <linearGradient id="arbRoute" x1="0%" x2="100%">
          <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0} />
          <stop
            offset="18%"
            stopColor="var(--color-brand)"
            stopOpacity={0.85}
          />
          <stop
            offset="100%"
            stopColor="var(--color-accent)"
            stopOpacity={0.9}
          />
        </linearGradient>
      </defs>
      <path
        d="M221.914,251.753L211.416,240.146L211.21,228.363L205.103,228.363L208.259,212.195L198.447,195.099L175.118,182.672L161.875,160.932L166.335,142.916L175.873,134.89L174.432,121.239L161.944,114.196L149.593,85.875L139.163,66.623L142.937,59.119L136.968,31.031L150.005,24L153.024,33.326L162.698,44.676L175.735,47.905L182.666,47.201L205.103,29.067L212.239,27.226L217.865,34.494L211.347,46.622L223.217,59.365L227.952,58.173L233.99,76.011L252.036,81.011L265.279,92.987L292.382,97.095L322.161,90.808L324.014,85.187L340.756,80.564L354.274,66.787L367.036,67.482L375.407,62.977L388.925,65.231L410.058,77.435L425.222,80.077L447.042,101.195L461.246,102.038L462.892,121.914L455.139,150.909L449.924,167.649L458.226,171.019L450.061,183.48L456.305,201.55L457.815,215.795L472.224,219.577L473.802,233.887L456.511,253.911L465.911,265.408L473.596,278.576L491.848,288.119L492.328,307.086L501.454,310.571L503.032,320.418L475.586,331.412L468.382,356L432.496,349.617L411.705,344.756L390.228,342.036L382.132,315.934L373.006,312.131L358.322,315.97L339.109,326.3L315.849,319.226L296.568,302.759L278.247,296.637L265.485,276.074L251.419,246.871L241.195,250.45L229.05,243.137Z"
        fill="url(#arbIranFill)"
        stroke="var(--color-brand)"
        strokeOpacity={0.35}
        strokeWidth={1}
      />
      <path
        d="M275.7,121.0 Q296.2,117.7 307.6,100.3"
        stroke="url(#arbRoute)"
        strokeWidth={1.3}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M275.7,121.0 Q357.2,148.3 432.3,106.7"
        stroke="url(#arbRoute)"
        strokeWidth={1.3}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M275.7,121.0 Q265.4,131.1 265.9,145.4"
        stroke="url(#arbRoute)"
        strokeWidth={1.3}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M275.7,121.0 Q263.0,157.2 281.0,191.0"
        stroke="url(#arbRoute)"
        strokeWidth={1.3}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M275.7,121.0 Q256.2,194.8 297.5,259.1"
        stroke="url(#arbRoute)"
        strokeWidth={1.3}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M275.7,121.0 Q282.8,235.5 368.9,311.2"
        stroke="url(#arbRoute)"
        strokeWidth={1.3}
        strokeLinecap="round"
        fill="none"
      />
      <g transform="translate(275.7,121.0)">
        <circle
          r={5}
          fill="var(--color-brand)"
          stroke="var(--color-surface)"
          strokeWidth={1.6}
        />
        <text
          x={0}
          y={-9}
          textAnchor="middle"
          fontSize="11.5"
          fontWeight="600"
          fill="var(--color-secondary-2)"
          stroke="var(--color-surface)"
          strokeWidth="3.5"
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          {"تهران"}
        </text>
      </g>
      <g transform="translate(307.6,100.3)">
        <circle
          r={3.6}
          fill="var(--color-surface)"
          stroke="var(--color-brand)"
          strokeWidth={1.8}
        />
        <text
          x={9}
          y={-9}
          textAnchor="start"
          fontSize="11.5"
          fontWeight="600"
          fill="var(--color-secondary-2)"
          stroke="var(--color-surface)"
          strokeWidth="3.5"
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          {"مازندران"}
        </text>
      </g>
      <g transform="translate(432.3,106.7)">
        <circle
          r={3.6}
          fill="var(--color-surface)"
          stroke="var(--color-brand)"
          strokeWidth={1.8}
        />
        <text
          x={9}
          y={-9}
          textAnchor="start"
          fontSize="11.5"
          fontWeight="600"
          fill="var(--color-secondary-2)"
          stroke="var(--color-surface)"
          strokeWidth="3.5"
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          {"خراسان"}
        </text>
      </g>
      <g transform="translate(265.9,145.4)">
        <circle
          r={3.6}
          fill="var(--color-surface)"
          stroke="var(--color-brand)"
          strokeWidth={1.8}
        />
        <text
          x={9}
          y={-9}
          textAnchor="start"
          fontSize="11.5"
          fontWeight="600"
          fill="var(--color-secondary-2)"
          stroke="var(--color-surface)"
          strokeWidth="3.5"
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          {"قم"}
        </text>
      </g>
      <g transform="translate(281.0,191.0)">
        <circle
          r={3.6}
          fill="var(--color-surface)"
          stroke="var(--color-brand)"
          strokeWidth={1.8}
        />
        <text
          x={9}
          y={-9}
          textAnchor="start"
          fontSize="11.5"
          fontWeight="600"
          fill="var(--color-secondary-2)"
          stroke="var(--color-surface)"
          strokeWidth="3.5"
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          {"اصفهان"}
        </text>
      </g>
      <g transform="translate(297.5,259.1)">
        <circle
          r={3.6}
          fill="var(--color-surface)"
          stroke="var(--color-brand)"
          strokeWidth={1.8}
        />
        <text
          x={9}
          y={-9}
          textAnchor="start"
          fontSize="11.5"
          fontWeight="600"
          fill="var(--color-secondary-2)"
          stroke="var(--color-surface)"
          strokeWidth="3.5"
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          {"شیراز"}
        </text>
      </g>
      <g transform="translate(368.9,311.2)">
        <circle
          r={3.6}
          fill="var(--color-surface)"
          stroke="var(--color-brand)"
          strokeWidth={1.8}
        />
        <text
          x={9}
          y={-9}
          textAnchor="start"
          fontSize="11.5"
          fontWeight="600"
          fill="var(--color-secondary-2)"
          stroke="var(--color-surface)"
          strokeWidth="3.5"
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          {"بندرعباس"}
        </text>
      </g>
    </svg>
  );
}
