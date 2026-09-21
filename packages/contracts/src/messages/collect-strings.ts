/**
 * همه‌ی مقادیر رشته‌ایِ برگ را از یک آبجکت پیام تودرتو جمع می‌کند — برای
 * تست‌های forbidden-words و نیم‌فاصله. مقادیر تابعی (مثل template)
 * فراخوانی نمی‌شوند چون قالب‌شان (نه خروجی نهایی‌شان) باید بررسی شود؛
 * برای پوشش‌دادن آن‌ها با یک ورودی نمونه صدا زده می‌شوند.
 */
export function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value);
  } else if (typeof value === "function") {
    try {
      const sample = (value as (...args: string[]) => unknown)(
        "SAMPLE",
        "SAMPLE",
      );
      if (typeof sample === "string") out.push(sample);
    } catch {
      // توابعی که با آرگومان نمونه اجرا نمی‌شوند نادیده گرفته می‌شوند.
    }
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, out));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectStrings(item, out));
  }
  return out;
}
