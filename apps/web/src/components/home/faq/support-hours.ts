/**
 * T-212 §۳ — «همین حالا آنلاین» فقط وقتی ساعت واقعی تهران داخل
 * `storeFacts.support.hours` است. سمت کلاینت محاسبه می‌شود (نه سرور) تا
 * کش صفحه ساعت غلط نشان ندهد.
 */
export function isWithinSupportHours(
  now: Date,
  hours: { from: number; to: number },
): boolean {
  const tehranHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tehran",
      hour: "numeric",
      hourCycle: "h23",
    }).format(now),
  );
  return tehranHour >= hours.from && tehranHour < hours.to;
}
