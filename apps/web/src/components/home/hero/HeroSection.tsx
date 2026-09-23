import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PublicHomepageBlock } from "@arbyte/contracts";
import { HeroScroll } from "./HeroScroll";
import type { HeroManifest } from "./hero-engine";

interface HeroSectionProps {
  block: Extract<PublicHomepageBlock, { type: "HERO" }>;
}

/**
 * T-211 §۲ — پوسته‌ی سروری هیرو: مانیفست فریم‌ها را از دیسک می‌خواند (فایل
 * استاتیک در public/، نه فراخوانی شبکه) و به HeroScroll (کلاینت) می‌دهد.
 * اگر فایل نبود یا شکل نامعتبر داشت، `null` می‌رود — HeroScroll خودش
 * پوستر ثابت را رندر می‌کند، صفحه نمی‌شکند.
 */
export async function HeroSection({ block }: HeroSectionProps) {
  const manifest = await readHeroManifest(block.framesManifest);
  return <HeroScroll manifest={manifest} />;
}

async function readHeroManifest(
  manifestPath: string | null,
): Promise<HeroManifest | null> {
  if (!manifestPath) return null;
  try {
    const relative = manifestPath.replace(/^\/+/, "");
    const filePath = path.join(process.cwd(), "public", relative);
    const raw = await readFile(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (!isHeroManifest(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isHeroManifest(value: unknown): value is HeroManifest {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.count === "number" &&
    typeof v.width === "number" &&
    typeof v.height === "number" &&
    typeof v.pattern === "string" &&
    typeof v.mobilePattern === "string" &&
    Array.isArray(v.bands)
  );
}
