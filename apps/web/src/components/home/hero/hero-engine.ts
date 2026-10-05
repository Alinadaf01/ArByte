/**
 * T-211 §۲ — منطق خالص (بدون React/DOM) اسکراب هیرو، پورت‌شده از
 * `Home.dc.html` (خطوط ۹۱۴–۹۸۶، ۱۰۴۱–۱۰۷۱). جدا از کامپوننت نگه داشته شده
 * تا قابل تست باشد — کامپوننت فقط این توابع را روی ref/DOM اعمال می‌کند.
 */

/** AUDIT-4 — یک ویدیو برای هر breakpoint + پوستر AVIF (به‌جای ۲۲۰ فریم جدا). */
export interface HeroMediaPair {
  desktop: string;
  mobile: string;
}

export interface HeroManifest {
  count: number;
  width: number;
  height: number;
  fps: number;
  video: HeroMediaPair;
  /** جایگزین VP9 برای مرورگرهای بدون H.264؛ فقط وقتی MP4 قابل‌پخش نیست. */
  videoWebm?: HeroMediaPair;
  poster: HeroMediaPair;
  posterEnd: HeroMediaPair;
  bands: [number, number, number][];
}

/** چهار بازه‌ی پیشرفت کارت گام — Home.dc.html خط ۹۱۴. */
export const HERO_STEP_RANGES: readonly [number, number][] = [
  [0, 0.26],
  [0.26, 0.52],
  [0.52, 0.78],
  [0.78, 1.01],
];

/**
 * فریم (اعشاری، از اسکرول) → زمان ویدیو. وسط فریم هدف گرفته می‌شود تا
 * گرد شدن ممیز شناور فریم قبلی را نشان ندهد؛ هرگز از طول ویدیو جلوتر نمی‌رود.
 */
export function frameToTime(
  frame: number,
  fps: number,
  duration: number,
): number {
  const t = (Math.max(0, frame) + 0.5) / fps;
  return Number.isFinite(duration) && duration > 0
    ? Math.min(t, Math.max(0, duration - 0.5 / fps))
    : t;
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
 * target. ضریب ۰٫۲۲ (قبلاً ۰٫۴۲ بود، بعد برای نرمی به ۰٫۱۲ کم شد — اما
 * ۰٫۱۲ چنان عقب‌تر از اسکرول واقعی می‌ماند که لپ‌تاپ کند و بی‌حس حرکت
 * می‌کرد؛ ۰٫۲۲ بین آن دو، هم‌زمان با اسکرول حس می‌شود بدون لرزش فریم به فریم).
 */
export function easeStep(disp: number, target: number): number {
  const d = target - disp;
  if (Math.abs(d) < 0.05) return target;
  return disp + d * 0.22;
}
