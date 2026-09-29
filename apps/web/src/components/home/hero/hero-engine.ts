/**
 * T-211 §۲ — منطق خالص (بدون React/DOM) اسکراب هیرو، پورت‌شده از
 * `Home.dc.html` (خطوط ۹۱۴–۹۸۶، ۱۰۴۱–۱۰۷۱). جدا از کامپوننت نگه داشته شده
 * تا قابل تست باشد — کامپوننت فقط این توابع را روی ref/DOM اعمال می‌کند.
 */

export interface HeroManifest {
  count: number;
  width: number;
  height: number;
  pattern: string;
  mobilePattern: string;
  bands: [number, number, number][];
}

/** چهار بازه‌ی پیشرفت کارت گام — Home.dc.html خط ۹۱۴. */
export const HERO_STEP_RANGES: readonly [number, number][] = [
  [0, 0.26],
  [0.26, 0.52],
  [0.52, 0.78],
  [0.78, 1.01],
];

export function frameUrl(
  manifest: HeroManifest,
  i: number,
  mobile: boolean,
): string {
  const pattern = mobile ? manifest.mobilePattern : manifest.pattern;
  return pattern.replace("{i}", String(i));
}

/** کدام گام (۰..۳) در پیشرفت p فعال است. */
export function activeStep(p: number): number {
  let act = 0;
  HERO_STEP_RANGES.forEach((range, i) => {
    if (p >= range[0] && p < range[1]) act = i;
  });
  return act;
}

/**
 * بازه‌ی crop برای فریم i را از جدول bands درون‌یابی می‌کند — همان
 * `band(i)` طراحی. bands نقاط نمونه‌اند (نه هر فریم)؛ بین دو نقطه‌ی
 * همسایه خطی درون‌یابی می‌شود.
 */
export function bandAt(
  bands: readonly [number, number, number][],
  i: number,
): [number, number, number] {
  if (bands.length === 0) return [i, 0, 100];
  const first = bands[0];
  if (first && i <= first[0]) return first;
  for (let k = 1; k < bands.length; k++) {
    const c = bands[k];
    if (c && i <= c[0]) {
      const a = bands[k - 1];
      if (!a) return c;
      const f = (i - a[0]) / (c[0] - a[0] || 1);
      return [i, a[1] + (c[1] - a[1]) * f, a[2] + (c[2] - a[2]) * f];
    }
  }
  return bands[bands.length - 1] ?? [i, 0, 100];
}

/**
 * ترانسفورم CSS فریم را طوری حساب می‌کند که لپ‌تاپِ همان بازه‌ی crop در
 * کادر بماند — همان `fit(i)` طراحی، ولی نسبت فریم از manifest.width/height
 * می‌آید (نه عدد هاردکد ۱۴۰۰/۲۱۶۴) تا با هر منبع ویدیویی درست کار کند.
 */
export function fitTransform(input: {
  band: [number, number, number];
  panelHeight: number;
  panelWidth: number;
  frameWidth: number;
  frameHeight: number;
}): string {
  const {
    band,
    panelHeight: P,
    panelWidth: PW,
    frameWidth,
    frameHeight,
  } = input;
  const h = Math.max(8, band[2] - band[1]) / 100;
  const bot = band[2] / 100;
  const frameW = (P * frameWidth) / frameHeight;
  const scH = 0.94 / h;
  const scW = (PW * 0.98) / (frameW * 0.8);
  const sc = Math.max(1, Math.min(scH, scW, 2.7));
  const ty = ((1 - bot) * sc - 0.015) * 100;
  return `translate(-50%, ${ty.toFixed(2)}%) scale(${sc.toFixed(3)})`;
}

/**
 * رشته‌ی eased-ease شبیه‌سازی‌شده‌ی loop() طراحی — یک گام از disp به سمت
 * target. ضریب ۰٫۱۲ (E-01 §۴ — قبلاً ۰٫۴۲؛ چرخش نرم‌تر بدون دو برابر کردن
 * حجم، ترکیب دو فریم مجاور در HeroScrollEngine باقی نرمی را می‌دهد).
 */
export function easeStep(disp: number, target: number): number {
  const d = target - disp;
  if (Math.abs(d) < 0.05) return target;
  return disp + d * 0.12;
}

/**
 * نزدیک‌ترین فریمِ از قبل بارگذاری‌شده به `target` — وقتی فریم دقیق هنوز
 * decode نشده (E-01 §۴: «اگر فریمی هنوز نرسیده، نزدیک‌ترین فریم بارگذاری‌شده،
 * نه جای خالی»). فریم صفر همیشه اول eager بارگذاری می‌شود، پس این تابع
 * همیشه چیزی پیدا می‌کند مگر `available` کاملاً خالی باشد.
 */
export function nearestAvailableFrame(
  available: { has(index: number): boolean },
  target: number,
  maxIndex: number,
): number {
  if (available.has(target)) return target;
  for (let d = 1; d <= maxIndex; d++) {
    const below = target - d;
    if (below >= 0 && available.has(below)) return below;
    const above = target + d;
    if (above <= maxIndex && available.has(above)) return above;
  }
  return target;
}
