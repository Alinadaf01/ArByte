/**
 * T-212 §۳ — «همین حالا آنلاین» فقط وقتی ساعت واقعی تهران داخل
 * `storeFacts.support.hours` است. سمت کلاینت محاسبه می‌شود (نه سرور) تا
 * کش صفحه ساعت غلط نشان ندهد.
 */
export function isWithinSupportHours(
  now: Date,
  hours: { from: number; to: number },
): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const tehranHour = part("hour") + part("minute") / 60;
  return tehranHour >= hours.from && tehranHour < hours.to;
}

/**
 * AUDIT §۱۲.۱۲ — بازه‌ی ساعت از همان منبع صفحه‌ی پشتیبانی (SiteSettings.
 * business_hours از /content/site-info)؛ متن آزاد ادمین مثل «۹ تا ۲۱» یا
 * «09:30 - 21:00». نبود یا نامفهوم بودن → پیش‌فرض storeFacts (همان رفتار
 * صفحه‌ی پشتیبانی).
 */
export function parseSupportHours(
  text: string | undefined,
): { from: number; to: number } | null {
  if (!text) return null;
  const latin = text.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  const match = latin.match(/(\d{1,2})(?::(\d{2}))?\D+?(\d{1,2})(?::(\d{2}))?/);
  if (!match) return null;
  const from = Number(match[1]) + Number(match[2] ?? 0) / 60;
  const to = Number(match[3]) + Number(match[4] ?? 0) / 60;
  return from < to && to <= 24 ? { from, to } : null;
}
