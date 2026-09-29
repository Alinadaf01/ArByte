#!/usr/bin/env node
/**
 * E-01 §۱ — favicon/آیکون‌ها از `logo-mark` (۱۰۳۷×۶۷۹، مربع نیست) —
 * روی بومِ مربع شفاف وسط‌چین می‌شود (کشیده نمی‌شود). `icon-maskable-512`
 * طبق مشخصات ماسک‌پذیر واقعی حاشیه‌ی امن ۲۰٪ + پس‌زمینه‌ی `#17151F` دارد
 * (بدون پس‌زمینه، سیستم‌عامل هنگام کراپ به دایره/مربع‌گرد لبه‌ها را می‌بُرد).
 * `sharp` نمی‌تواند `.ico` بنویسد — یک بسته‌بند ساده‌ی ICO (PNG-in-ICO،
 * پشتیبانی‌شده از ویندوز ویستا به بعد و همه‌ی مرورگرها) پایین همین فایل است،
 * به‌جای اضافه‌کردن یک devDependency فقط برای همین یک تبدیل.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
// از خودِ apps/web/public/brand (کامیت‌شده) می‌خواند، نه از ArByte/images/
// بیرون ریپو — تا این اسکریپت روی هر کلونی، بدون آن پوشه‌ی بیرونی، دوباره
// قابل‌اجرا بماند.
const BRAND_DIR = path.join(ROOT, "public", "brand");
const MARK_SRC = path.join(BRAND_DIR, "logo-mark.png");
const ICONS_DIR = path.join(ROOT, "public", "icons");
const APP_DIR = path.join(ROOT, "src", "app");

const DARK_BG = "#17151F";

/** مارک را روی بوم مربع شفاف وسط‌چین می‌کند؛ نسبت مارک (۱۰۳۷×۶۷۹) دست‌نخورده می‌ماند. */
async function markOnSquare(size, { paddingPercent = 8, background } = {}) {
  const inner = Math.round(size * (1 - paddingPercent / 50));
  const markBuffer = await sharp(MARK_SRC)
    .resize({ width: inner, height: inner, fit: "inside" })
    .toBuffer();
  const meta = await sharp(markBuffer).metadata();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: markBuffer,
        left: Math.round((size - (meta.width ?? inner)) / 2),
        top: Math.round((size - (meta.height ?? inner)) / 2),
      },
    ])
    .png();
}

/** ICONDIR + ICONDIRENTRY(های) با فریم‌های PNG — فرمت PNG-in-ICO. */
function buildIco(pngBuffers) {
  const HEADER_SIZE = 6;
  const ENTRY_SIZE = 16;
  const header = Buffer.alloc(HEADER_SIZE);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(pngBuffers.length, 4);

  let offset = HEADER_SIZE + ENTRY_SIZE * pngBuffers.length;
  const entries = [];
  const datas = [];
  for (const { size, buffer } of pngBuffers) {
    const entry = Buffer.alloc(ENTRY_SIZE);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // no palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    datas.push(buffer);
    offset += buffer.length;
  }
  return Buffer.concat([header, ...entries, ...datas]);
}

async function main() {
  fs.mkdirSync(ICONS_DIR, { recursive: true });

  // favicon.ico — ۱۶/۳۲/۴۸، بدون پس‌زمینه (شفاف، مثل باقی آیکون‌های غیرماسکبل).
  const icoSizes = [16, 32, 48];
  const icoFrames = [];
  for (const size of icoSizes) {
    const buffer = await (await markOnSquare(size, { paddingPercent: 6 })).toBuffer();
    icoFrames.push({ size, buffer });
  }
  fs.writeFileSync(path.join(APP_DIR, "favicon.ico"), buildIco(icoFrames));
  console.log("favicon.ico ->", icoSizes.join("/"));

  // apple-touch-icon (Next's apple-icon.* قرارداد) — ۱۸۰×۱۸۰.
  await (await markOnSquare(180, { paddingPercent: 10 })).toFile(
    path.join(APP_DIR, "apple-icon.png"),
  );
  console.log("apple-icon.png -> 180x180");

  // icon.png (Next's icon.* قرارداد، برای <link rel="icon">) — ۵۱۲×۵۱۲.
  await (await markOnSquare(512, { paddingPercent: 8 })).toFile(
    path.join(APP_DIR, "icon.png"),
  );
  console.log("icon.png -> 512x512");

  // مانیفست PWA — icon-192/512 شفاف، icon-maskable-512 با حاشیه‌ی امن ۲۰٪ + پس‌زمینه.
  await (await markOnSquare(192, { paddingPercent: 8 })).toFile(
    path.join(ICONS_DIR, "icon-192.png"),
  );
  await (await markOnSquare(512, { paddingPercent: 8 })).toFile(
    path.join(ICONS_DIR, "icon-512.png"),
  );
  await (
    await markOnSquare(512, { paddingPercent: 20, background: DARK_BG })
  ).toFile(path.join(ICONS_DIR, "icon-maskable-512.png"));
  console.log("public/icons/icon-{192,512,maskable-512}.png");

  // OG — ۱۲۰۰×۶۳۰، logo-full-dark وسط روی #17151F + گرادیان بنفش ملایم برند.
  const OG_W = 1200;
  const OG_H = 630;
  const bgSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}">
      <defs>
        <radialGradient id="g" cx="50%" cy="38%" r="65%">
          <stop offset="0%" stop-color="#6C4DFF" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#6C4DFF" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${OG_W}" height="${OG_H}" fill="${DARK_BG}"/>
      <rect width="${OG_W}" height="${OG_H}" fill="url(#g)"/>
    </svg>`,
  );
  const logoBuffer = await sharp(path.join(BRAND_DIR, "logo-full-dark.png"))
    .resize({ height: 440 })
    .toBuffer();
  const logoMeta = await sharp(logoBuffer).metadata();
  await sharp(bgSvg)
    .composite([
      {
        input: logoBuffer,
        left: Math.round((OG_W - (logoMeta.width ?? 0)) / 2),
        top: Math.round((OG_H - (logoMeta.height ?? 0)) / 2),
      },
    ])
    .png()
    .toFile(path.join(APP_DIR, "opengraph-image.png"));
  console.log("opengraph-image.png -> 1200x630");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
