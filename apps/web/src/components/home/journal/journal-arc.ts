/**
 * T-212 §۲ — منطق خالص قوس مجله، پورت‌شده از `layoutArc()`/طراحی
 * (Home.dc.html خط ۹۲۰–۹۵۷). جدا از React نگه داشته شده تا تست‌پذیر باشد؛
 * کامپوننت فقط این توابع را روی ref اعمال می‌کند. ⚠️ فقط دسکتاپ — موبایل
 * ردیف افقی ساده‌ی CSS است، بدون این منطق (مثل طراحی: `mobile===true` در
 * layoutArc زودتر برمی‌گردد).
 */

const CARD_COUNT = 9;

/** پیشرفت مورف (m) و انحراف (rp) — از موقعیت زنده‌ی قوس نسبت به viewport. */
export function computeMorphProgress(
  arcTop: number,
  viewportHeight: number,
): { m: number; rp: number } {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const m = clamp((viewportHeight * 1.0 - arcTop) / (viewportHeight * 0.58));
  const rp = clamp((viewportHeight * 0.5 - arcTop) / (viewportHeight * 0.6));
  return { m, rp };
}

export interface CardTransform {
  x: number;
  y: number;
  rotateDeg: number;
  scale: number;
  opacity: number;
  zIndex: number;
}

const lerp = (a: number, b: number, t: number) => a * (1 - t) + b * t;

/** ترانسفورم کارت i از N — همان محاسبه‌ی حلقه‌ی داخل layoutArc(). */
export function computeCardTransform(
  i: number,
  width: number,
  height: number,
  m: number,
  rp: number,
): CardTransform {
  const N = CARD_COUNT;
  const narrow = width < 720;
  const spread = narrow ? 78 : 54;
  const half = (spread * Math.PI) / 360;
  const chord = Math.max(width * 0.5, width - (narrow ? 140 : 180));
  const R = chord / (2 * Math.sin(half));
  const cy = -height * 0.17 + R;
  const start = -90 - spread / 2;
  const step = spread / (N - 1);
  const drift = (rp - 0.5) * 3;
  const arcScale = narrow ? 0.88 : 0.95;
  const ringR = Math.min(width, height) * 0.26;

  const ra = ((i / N) * 360 - 90) * (Math.PI / 180);
  const rx = Math.cos(ra) * ringR;
  const ry = Math.sin(ra) * ringR;
  const rr = (i / N) * 360;

  const aa = start + i * step + drift;
  const aRad = (aa * Math.PI) / 180;
  const ax = Math.cos(aRad) * R;
  const ay = Math.sin(aRad) * R + cy;

  const x = lerp(rx, ax, m);
  const y = lerp(ry, ay, m);
  const rot = lerp(rr, aa + 90, m);
  const scale = lerp(0.82, arcScale, m);

  return {
    x,
    y,
    rotateDeg: rot,
    scale,
    opacity: 0.18 + 0.82 * m,
    zIndex: 10 + i,
  };
}

export function cardTransformCss(t: CardTransform): string {
  return `translate3d(${t.x.toFixed(1)}px, ${t.y.toFixed(1)}px, 0) rotate(${t.rotateDeg.toFixed(2)}deg) scale(${t.scale.toFixed(3)})`;
}
