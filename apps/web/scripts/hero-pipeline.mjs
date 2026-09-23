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

export function writeManifest(outDir, { count, width, height, bands }) {
  const manifest = {
    count,
    width,
    height,
    pattern: "/hero/frames/f_{i}.webp",
    mobilePattern: "/hero/frames/m/f_{i}.webp",
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
