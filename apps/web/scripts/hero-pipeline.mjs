import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";

/**
 * T-211 §۲ — خط لوله‌ی مشترک `hero:build`/`hero:dev-frames`. هیچ‌کدام از این
 * دو اسکریپت مستقیم قاب تولید نمی‌کنند؛ هر دو از همین توابع استفاده می‌کنند
 * تا رفتار (سایز/کیفیت/محاسبه‌ی bands) دقیقاً یکی بماند.
 */

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const VIDEO_EXT = new Set([".mp4", ".mov", ".m4v", ".webm"]);

export function isVideoFile(p) {
  return VIDEO_EXT.has(path.extname(p).toLowerCase());
}

/** ویدیو را با نرخ ثابت (۳۰fps) به فریم‌های PNG خام در tmpDir می‌کشد. */
export function extractFramesFromVideo(videoPath, tmpDir) {
  fs.mkdirSync(tmpDir, { recursive: true });
  const pattern = path.join(tmpDir, "raw_%05d.png");
  execFileSync(ffmpegPath, ["-y", "-i", videoPath, "-vf", "fps=30", pattern], {
    stdio: "inherit",
  });
  return listImageFiles(tmpDir);
}

/** فایل‌های تصویری یک پوشه را مرتب‌شده برمی‌گرداند (فریم‌های از‌پیش‌استخراج‌شده). */
export function listImageFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
    .map((f) => path.join(dir, f));
}

/** N مورد را به‌صورت یکنواخت از یک آرایه نمونه‌برداری می‌کند (کم/زیاد از count هم درست کار می‌کند). */
export function pickEven(items, count) {
  if (items.length === 0) return [];
  if (items.length === count) return items;
  const out = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.min(
      items.length - 1,
      Math.round((i * (items.length - 1)) / Math.max(1, count - 1)),
    );
    out.push(items[idx]);
  }
  return out;
}

/** فریم‌های انتخاب‌شده را به WebP تبدیل می‌کند؛ خروجی نام‌گذاری `{prefix}{i}.webp`. */
export async function convertFrames(framePaths, outDir, { width, quality, prefix }) {
  fs.mkdirSync(outDir, { recursive: true });
  let firstMeta = null;
  for (let i = 0; i < framePaths.length; i++) {
    const outPath = path.join(outDir, `${prefix}${i}.webp`);
    const pipeline = sharp(framePaths[i]).resize({ width, withoutEnlargement: false });
    await pipeline.webp({ quality }).toFile(outPath);
    if (i === 0) firstMeta = await sharp(outPath).metadata();
  }
  return firstMeta;
}

/**
 * کادر پیکسل‌های غیرسفید هر فریم را به درصد ارتفاع تبدیل می‌کند — همان
 * جدول `bands` دستی طراحی، ولی خودکار. روی نسخه‌ی کوچک‌شده (عرض ۱۲۰px)
 * حساب می‌شود تا برای ۲۲۰ فریم سریع بماند.
 */
export async function computeBand(framePath) {
  const SAMPLE_WIDTH = 120;
  const { data, info } = await sharp(framePath)
    .resize({ width: SAMPLE_WIDTH })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const WHITE_THRESHOLD = 246;
  let top = height;
  let bottom = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * channels;
      const isWhite =
        data[o] >= WHITE_THRESHOLD &&
        data[o + 1] >= WHITE_THRESHOLD &&
        data[o + 2] >= WHITE_THRESHOLD;
      if (!isWhite) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        break;
      }
    }
  }
  if (top > bottom) {
    // فریم کاملاً سفید بود — بند خنثی (کل ارتفاع).
    return [0, 100];
  }
  return [
    Math.round((top / height) * 100),
    Math.round(((bottom + 1) / height) * 100),
  ];
}

/**
 * AUDIT-4 — فریم‌ها → یک ویدیوی کوتاه برای هر breakpoint + پوستر AVIF.
 *
 * H.264 با GOP=2 (هر دو فریم یک keyframe) تا `video.currentTime` روی اسکرول
 * بدون پرش seek کند. اندازه‌گیری روی همین فریم‌ها: H.264 CRF34 دسکتاپ ۲٫۵MB
 * (SSIM 0.987) در برابر VP9 ۳٫۰MB (SSIM 0.959) با همان GOP — پس MP4 منبع
 * اصلی است و WebM/VP9 فقط جایگزین مرورگرهایی که H.264 ندارند (Chromium بدون
 * کُدک‌های اختصاصی؛ انتخاب با canPlayType، دو فایل هرگز با هم دانلود نمی‌شوند).
 * `faststart` تا متادیتا اول فایل باشد.
 */
export const HERO_FPS = 30;
const VIDEO_CRF = 34;
const VP9_CRF = 56;

export function encodeHeroVideo(framesDir, outPath, { width }) {
  execFileSync(
    ffmpegPath,
    [
      "-y", "-hide_banner", "-loglevel", "error",
      "-framerate", String(HERO_FPS),
      "-i", path.join(framesDir, "f_%d.webp"),
      "-vf", `scale=${width}:-2`,
      "-c:v", "libx264", "-preset", "slow", "-crf", String(VIDEO_CRF),
      "-g", "2", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an",
      outPath,
    ],
    { stdio: "inherit" },
  );
}

export function encodeHeroWebm(framesDir, outPath, { width }) {
  execFileSync(
    ffmpegPath,
    [
      "-y", "-hide_banner", "-loglevel", "error",
      "-framerate", String(HERO_FPS),
      "-i", path.join(framesDir, "f_%d.webp"),
      "-vf", `scale=${width}:-2`,
      "-c:v", "libvpx-vp9", "-crf", String(VP9_CRF), "-b:v", "0",
      "-g", "2", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2",
      "-pix_fmt", "yuv420p", "-an",
      outPath,
    ],
    { stdio: "inherit" },
  );
}

/** پوستر AVIF (کاندید LCP، قبل از ویدیو) از فریم اول/آخر. */
export async function writePoster(framePath, outPath, { width }) {
  await sharp(framePath).resize({ width }).avif({ quality: 55, effort: 6 }).toFile(outPath);
}

export async function buildHeroMedia({ desktopFramesDir, mobileFramesDir, outDir, count, desktopWidth, mobileWidth }) {
  fs.mkdirSync(outDir, { recursive: true });
  encodeHeroVideo(desktopFramesDir, path.join(outDir, "hero-desktop.mp4"), { width: desktopWidth });
  encodeHeroVideo(mobileFramesDir, path.join(outDir, "hero-mobile.mp4"), { width: mobileWidth });
  encodeHeroWebm(desktopFramesDir, path.join(outDir, "hero-desktop.webm"), { width: desktopWidth });
  encodeHeroWebm(mobileFramesDir, path.join(outDir, "hero-mobile.webm"), { width: mobileWidth });
  const last = count - 1;
  await writePoster(path.join(desktopFramesDir, "f_0.webp"), path.join(outDir, "poster-desktop.avif"), { width: desktopWidth });
  await writePoster(path.join(mobileFramesDir, "f_0.webp"), path.join(outDir, "poster-mobile.avif"), { width: mobileWidth });
  await writePoster(path.join(desktopFramesDir, `f_${last}.webp`), path.join(outDir, "poster-end-desktop.avif"), { width: desktopWidth });
  await writePoster(path.join(mobileFramesDir, `f_${last}.webp`), path.join(outDir, "poster-end-mobile.avif"), { width: mobileWidth });
}

export function writeManifest(outDir, { count, width, height, bands }) {
  const manifest = {
    count,
    width,
    height,
    fps: HERO_FPS,
    video: { desktop: "/hero/hero-desktop.mp4", mobile: "/hero/hero-mobile.mp4" },
    videoWebm: { desktop: "/hero/hero-desktop.webm", mobile: "/hero/hero-mobile.webm" },
    poster: { desktop: "/hero/poster-desktop.avif", mobile: "/hero/poster-mobile.avif" },
    posterEnd: { desktop: "/hero/poster-end-desktop.avif", mobile: "/hero/poster-end-mobile.avif" },
    bands,
  };
  fs.writeFileSync(
    path.join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  return manifest;
}

export function dirSizeBytes(dir) {
  let total = 0;
  for (const f of fs.readdirSync(dir, { recursive: true })) {
    const full = path.join(dir, String(f));
    if (fs.statSync(full).isFile()) total += fs.statSync(full).size;
  }
  return total;
}
