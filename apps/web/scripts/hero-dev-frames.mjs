#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  listImageFiles,
  pickEven,
  convertFrames,
  computeBand,
  writeManifest,
} from "./hero-pipeline.mjs";

/**
 * T-211 §۲ — `pnpm hero:dev-frames`: **فقط برای توسعه.** فریم‌های خودِ
 * طراحی (raw.githubusercontent.com/duthiljean/hero-apple) را دانلود و از
 * همان خط‌لوله‌ی `hero:build` عبور می‌دهد تا ظاهر دقیق طراحی محلی دیده شود.
 * این فریم‌ها تبلیغاتی MacBook با لوگوی اپل‌اند — هرگز روی سایت واقعی
 * نمی‌روند و هرگز کامیت نمی‌شوند (`public/hero/frames/` در .gitignore).
 */
const FRAME_COUNT = 220;
const DESKTOP_WIDTH = 1400;
const MOBILE_WIDTH = 800;
const QUALITY = 70;
const SOURCE_BASE =
  "https://raw.githubusercontent.com/duthiljean/hero-apple/main/frames/";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMP_DIR = path.resolve(__dirname, "../.hero-dev-tmp");
const OUT_DIR = path.resolve(__dirname, "../public/hero/frames");
const MOBILE_OUT_DIR = path.join(OUT_DIR, "m");
const MANIFEST_DIR = path.resolve(__dirname, "../public/hero");

function frameUrl(i) {
  const n = String(i * 4 + 1).padStart(4, "0");
  return `${SOURCE_BASE}frame_${n}.jpg`;
}

async function download(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
}

async function main() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  console.log(`دانلود ${FRAME_COUNT} فریم از منبع طراحی (فقط dev)...`);
  for (let i = 0; i < FRAME_COUNT; i++) {
    const dest = path.join(TMP_DIR, `raw_${String(i).padStart(5, "0")}.jpg`);
    if (fs.existsSync(dest)) continue;
    try {
      await download(frameUrl(i), dest);
    } catch (err) {
      console.warn(`رد شد: فریم ${i} (${err.message})`);
    }
    if (i % 40 === 0) console.log(`  ${i}/${FRAME_COUNT}`);
  }

  const rawFrames = listImageFiles(TMP_DIR);
  if (rawFrames.length === 0) {
    console.error("هیچ فریمی دانلود نشد — شبکه در دسترس نیست؟");
    process.exit(1);
  }
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
    const [top, bottom] = await computeBand(path.join(OUT_DIR, `f_${i}.webp`));
    bands.push([i, top, bottom]);
  }
  if (bands[bands.length - 1][0] !== FRAME_COUNT - 1) {
    const [top, bottom] = await computeBand(
      path.join(OUT_DIR, `f_${FRAME_COUNT - 1}.webp`),
    );
    bands.push([FRAME_COUNT - 1, top, bottom]);
  }

  writeManifest(MANIFEST_DIR, {
    count: FRAME_COUNT,
    width: desktopMeta?.width ?? DESKTOP_WIDTH,
    height: desktopMeta?.height ?? Math.round(DESKTOP_WIDTH * 0.75),
    bands,
  });

  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  console.log(`تمام شد (فقط dev) → ${MANIFEST_DIR}/manifest.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
