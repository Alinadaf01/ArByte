import Image from "next/image";

/**
 * E-01 §۱ — شش فایل واقعی `images/logo/*.png` (شفاف، برش‌خورده، تأییدشده‌ی
 * مدیر پروژه). نسبت هرگز دست نمی‌خورد — فقط ارتفاع (`className`ی فراخوان)
 * تنظیم می‌شود؛ عرض با `w-auto` از همان نسبت درونی (`width`/`height` پایین)
 * محاسبه می‌شود. `logo-mark` مربع نیست (۱۰۳۷×۶۷۹) — برای favicon/آیکون‌ها
 * جدا روی بومِ مربع وسط‌چین می‌شود (`scripts/generate-icons.mjs`)، نه اینجا.
 */
const LOGO_ASSETS = {
  "horizontal-light": {
    src: "/brand/logo-horizontal-light.png",
    width: 1570,
    height: 366,
  },
  "horizontal-dark": {
    src: "/brand/logo-horizontal-dark.png",
    width: 1696,
    height: 357,
  },
  "full-dark": { src: "/brand/logo-full-dark.png", width: 756, height: 867 },
  "full-light": { src: "/brand/logo-full-light.png", width: 876, height: 858 },
  mark: { src: "/brand/logo-mark.png", width: 1037, height: 679 },
  "mono-black": {
    src: "/brand/logo-mono-black.png",
    width: 1792,
    height: 363,
  },
} as const;

export type LogoVariant = keyof typeof LOGO_ASSETS;

interface LogoProps {
  variant: LogoVariant;
  alt: string;
  /** کلاس ارتفاع (مثلاً `h-8`) — عرض با `w-auto` همراه آن اضافه می‌شود. */
  className: string;
  priority?: boolean;
}

export function Logo({ variant, alt, className, priority }: LogoProps) {
  const asset = LOGO_ASSETS[variant];
  return (
    <Image
      src={asset.src}
      alt={alt}
      width={asset.width}
      height={asset.height}
      priority={priority}
      // G-02 — لوگو هرگز پهن‌تر از ~۲۴۰px نمایش داده نمی‌شود؛ بدون `sizes`،
      // next/image از عرض درونی (۱۵۷۰) نسخه‌ی ۳۸۴۰px را می‌خواست.
      sizes="240px"
      className={`w-auto ${className}`}
    />
  );
}
