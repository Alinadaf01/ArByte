#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isVideoFile,
  extractFramesFromVideo,
  listImageFiles,
  pickEven,
  convertFrames,
  computeBand,
  writeManifest,
  buildHeroMedia,
} from "./hero-pipeline.mjs";

/**
 * T-211 §۲ — `pnpm hero:build <video-or-folder>`: ویدیو یا پوشه‌ی تصاویر را
 * می‌گیرد، ۲۲۰ فریم یکنواخت بیرون می‌کشد، به WebP (دسکتاپ/موبایل) تبدیل
 * می‌کند، جدول bands را خودکار حساب می‌کند و manifest.json را می‌نویسد.
 */
const FRAME_COUNT = 220;
const DESKTOP_WIDTH = 1400;
const MOBILE_WIDTH = 800;
const QUALITY = 70;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// AUDIT-4 — فریم‌ها فقط ورودی میانی‌اند (gitignored)؛ سایت ویدیو + پوستر سرو می‌کند.
const OUT_DIR = path.resolve(__dirname, "../.hero-work/frames");
const MOBILE_OUT_DIR = path.join(OUT_DIR, "m");
const MANIFEST_DIR = path.resolve(__dirname, "../public/hero");

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("استفاده: pnpm hero:build <video-or-folder>");
    process.exit(1);
  }
  const inputPath = path.resolve(input);
  if (!fs.existsSync(inputPath)) {
    console.error(`مسیر پیدا نشد: ${inputPath}`);
    process.exit(1);
  }

  let rawFrames;
  const tmpDir = path.resolve(__dirname, "../.hero-tmp");
  if (isVideoFile(inputPath)) {
    console.log("استخراج فریم از ویدیو...");
    fs.rmSync(tmpDir, { recursive: true, force: true });
    rawFrames = extractFramesFromVideo(inputPath, tmpDir);
  } else if (fs.statSync(inputPath).isDirectory()) {
    rawFrames = listImageFiles(inputPath);
  } else {
    console.error("ورودی باید ویدیو (mp4/mov/m4v/webm) یا پوشه‌ی تصاویر باشد.");
    process.exit(1);
  }

  if (rawFrames.length === 0) {
    console.error("هیچ فریمی پیدا/استخراج نشد.");
    process.exit(1);
  }
  console.log(`${rawFrames.length} فریم خام → نمونه‌برداری به ${FRAME_COUNT} فریم`);
  const sampled = pickEven(rawFrames, FRAME_COUNT);

  console.log("تبدیل دسکتاپ به WebP...");
  const desktopMeta = await convertFrames(sampled, OUT_DIR, {
    width: DESKTOP_WIDTH,
    quality: QUALITY,
    prefix: "f_",
  });

  console.log("تبدیل موبایل به WebP...");
  await convertFrames(sampled, MOBILE_OUT_DIR, {
    width: MOBILE_WIDTH,
    quality: QUALITY,
    prefix: "f_",
  });

  console.log("محاسبه‌ی bands...");
  const bands = [];
  const bandStep = Math.max(1, Math.round(FRAME_COUNT / 24));
  for (let i = 0; i < FRAME_COUNT; i += bandStep) {
    const framePath = path.join(OUT_DIR, `f_${i}.webp`);
    const [top, bottom] = await computeBand(framePath);
    bands.push([i, top, bottom]);
  }
  if (bands[bands.length - 1][0] !== FRAME_COUNT - 1) {
    const [top, bottom] = await computeBand(
      path.join(OUT_DIR, `f_${FRAME_COUNT - 1}.webp`),
    );
    bands.push([FRAME_COUNT - 1, top, bottom]);
  }

  console.log("ساخت ویدیو و پوستر...");
  await buildHeroMedia({
    desktopFramesDir: OUT_DIR,
    mobileFramesDir: MOBILE_OUT_DIR,
    outDir: MANIFEST_DIR,
    count: FRAME_COUNT,
    desktopWidth: DESKTOP_WIDTH,
    mobileWidth: MOBILE_WIDTH,
  });

  writeManifest(MANIFEST_DIR, {
    count: FRAME_COUNT,
    width: desktopMeta?.width ?? DESKTOP_WIDTH,
    height: desktopMeta?.height ?? Math.round(DESKTOP_WIDTH * 0.75),
    bands,
  });

  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log(`تمام شد → ${MANIFEST_DIR}/manifest.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
