#!/usr/bin/env node
/**
 * T-212 §۴ — نقشه‌ی ایران را **یک‌بار** آفلاین می‌سازد (d3-geo/topojson-client/
 * world-atlas فقط اینجا، devDependency، هرگز در باندل کلاینت). خروجی یک
 * کامپوننت SVG ایستا در apps/web/src/components/home/community/IranMap.tsx
 * که کامیت می‌شود؛ صفحه اصلی در زمان اجرا صفر JS نقشه دارد.
 *
 * طراحی (Home.dc.html) این نقشه را با d3 زنده در مرورگر از unpkg/jsdelivr
 * می‌کشد (شبکه‌ی نقطه‌ای متحرک + مسیرهای پالسی) — طبق قاعده‌ی ۸ (بدون
 * درخواست دامنه‌ی خارجی در اجرا)، اینجا فقط مرز ایران + هفت شهر + مسیرها
 * به‌صورت ایستا رندر می‌شود؛ بافت نقطه‌ای/انیمیشن پالس که فقط تزئینی بود
 * حذف شد (در یک SVG ایستا معنایی ندارد).
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const OUT_FILE = path.join(
  __dirname,
  "..",
  "src",
  "components",
  "home",
  "community",
  "IranMap.tsx",
);

const WIDTH = 640;
const HEIGHT = 380;

const CITIES = [
  { name: "تهران", lon: 51.389, lat: 35.689, hub: true },
  { name: "مازندران", lon: 53.06, lat: 36.565 },
  { name: "خراسان", lon: 59.606, lat: 36.297 },
  { name: "قم", lon: 50.876, lat: 34.64 },
  { name: "اصفهان", lon: 51.667, lat: 32.65 },
  { name: "شیراز", lon: 52.531, lat: 29.591 },
  { name: "بندرعباس", lon: 56.279, lat: 27.187 },
];

function loadIranFeature() {
  const dataPath = require.resolve("world-atlas/countries-110m.json");
  const topo = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const all = feature(topo, topo.objects.countries).features;
  const iran = all.find((f) => f.id === "364");
  if (!iran) throw new Error("Iran (id 364) not found in world-atlas topology");
  return iran;
}

function buildArcPath(hub, p) {
  const mx = (hub.x + p.x) / 2;
  const my = (hub.y + p.y) / 2;
  const nx = -(p.y - hub.y);
  const ny = p.x - hub.x;
  const len = Math.sqrt(nx * nx + ny * ny) || 1;
  const bow = Math.min(44, len * 0.22);
  const cx = mx + (nx / len) * bow;
  const cy = my + (ny / len) * bow;
  return `M${hub.x.toFixed(1)},${hub.y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
}

function main() {
  const iran = loadIranFeature();
  const projection = geoMercator().fitExtent(
    [
      [30, 24],
      [WIDTH - 30, HEIGHT - 24],
    ],
    iran,
  );
  const boundaryPath = geoPath(projection);
  const d = boundaryPath(iran);
  if (!d) throw new Error("Failed to compute Iran boundary path");

  const points = CITIES.map((c) => {
    const [x, y] = projection([c.lon, c.lat]);
    return { ...c, x, y };
  });
  const hub = points.find((p) => p.hub);
  if (!hub) throw new Error("No hub city configured");

  const routes = points
    .filter((p) => !p.hub)
    .map((p) => ({ name: p.name, d: buildArcPath(hub, p) }));

  const citiesJsx = points
    .map(
      (p) => `        <g transform="translate(${p.x.toFixed(1)},${p.y.toFixed(1)})">
          <circle r={${p.hub ? 5 : 3.6}} fill="${p.hub ? "var(--color-brand)" : "var(--color-surface)"}" stroke="${p.hub ? "var(--color-surface)" : "var(--color-brand)"}" strokeWidth={${p.hub ? 1.6 : 1.8}} />
          <text x={${p.hub ? 0 : 9}} y={-9} textAnchor="${p.hub ? "middle" : "start"}" fontSize="11.5" fontWeight="600" fill="var(--color-secondary-2)" stroke="var(--color-surface)" strokeWidth="3.5" strokeLinejoin="round" paintOrder="stroke">
            {"${p.name}"}
          </text>
        </g>`,
    )
    .join("\n");

  const routesJsx = routes
    .map(
      (r) =>
        `        <path d="${r.d}" stroke="url(#arbRoute)" strokeWidth={1.3} strokeLinecap="round" fill="none" />`,
    )
    .join("\n");

  const source = `import type { SVGProps } from "react";

/**
 * T-212 §۴ — تولیدشده‌ی خودکار توسط \`pnpm --filter @arbyte/web map:build\`
 * (\`scripts/build-iran-map.mjs\`، d3-geo + topojson-client + world-atlas).
 * دستی ویرایش نکنید — دوباره اسکریپت را اجرا کنید.
 * صفر d3/topojson در این فایل — فقط مسیر SVG محاسبه‌شده و مختصات ثابت.
 */
export function IranMap(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 ${WIDTH} ${HEIGHT}" width="100%" height="100%" role="img" aria-label="نقشه ایران و مسیرهای ارسال آربایت از تهران" {...props}>
      <defs>
        <linearGradient id="arbIranFill" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.17} />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.14} />
        </linearGradient>
        <linearGradient id="arbRoute" x1="0%" x2="100%">
          <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0} />
          <stop offset="18%" stopColor="var(--color-brand)" stopOpacity={0.85} />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.9} />
        </linearGradient>
      </defs>
      <path d="${d}" fill="url(#arbIranFill)" stroke="var(--color-brand)" strokeOpacity={0.35} strokeWidth={1} />
${routesJsx}
${citiesJsx}
    </svg>
  );
}
`;

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, source);
  console.log("نقشه ساخته شد →", OUT_FILE);
}

main();
