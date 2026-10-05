import type { SiteInfo } from "@arbyte/contracts";
import { formatNumberFa, storeFacts } from "@arbyte/contracts";

/**
 * ساعت کاری پشتیبانی — تنها منبع: `SiteSettings.business_hours` در پنل
 * (`/content/site-info`)، ردیف‌های آزاد مثل
 * `{day: "شنبه تا پنجشنبه", time: "۹:۳۰ تا ۱۸:۰۰"}`. هدر، FAQ صفحه‌ی اصلی و
 * صفحه‌ی پشتیبانی همه از همین‌جا می‌خوانند. نبود ردیف → پیش‌فرض storeFacts.
 */
export type BusinessHoursRow = SiteInfo["businessHours"][number];

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function toLatin(text: string): string {
  return text.replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)));
}

/** بازه‌ی ساعت به عدد اعشاری (۹:۳۰ → ۹٫۵)؛ نامفهوم → null. */
export function parseTimeRange(
  text: string | undefined,
): { from: number; to: number } | null {
  if (!text) return null;
  const match = toLatin(text).match(
    /(\d{1,2})(?::(\d{2}))?\D+?(\d{1,2})(?::(\d{2}))?/,
  );
  if (!match) return null;
  const from = Number(match[1]) + Number(match[2] ?? 0) / 60;
  const to = Number(match[3]) + Number(match[4] ?? 0) / 60;
  return from < to && to <= 24 ? { from, to } : null;
}

// ترتیب هفته‌ی ایرانی؛ مقدار = Date.getDay() (یکشنبه=۰ … شنبه=۶).
const WEEK: [string, number][] = [
  ["شنبه", 6],
  ["یکشنبه", 0],
  ["دوشنبه", 1],
  ["سهشنبه", 2],
  ["چهارشنبه", 3],
  ["پنجشنبه", 4],
  ["جمعه", 5],
];
// بلندتر اول، چون «شنبه» درون نام بقیه هم هست.
const DAY_RE = new RegExp(
  [...WEEK.map(([name]) => name)].sort((a, b) => b.length - a.length).join("|"),
  "g",
);

/** روزهای ردیف؛ null یعنی «همه‌ی روزها» (همه‌روزه، هر روز، یا نامفهوم). */
export function parseDays(text: string | undefined): Set<number> | null {
  const normalized = (text ?? "").replace(/ي/g, "ی").replace(/[‌\s]/g, "");
  if (/همه|هرروز/.test(normalized)) return null;
  const found = normalized.match(DAY_RE) ?? [];
  if (found.length === 0) return null;
  const order = found.map((name) => WEEK.findIndex(([n]) => n === name));
  const isRange = found.length === 2 && /تا|-|–/.test(normalized);
  const indexes = isRange
    ? Array.from(
        { length: ((order[1]! - order[0]! + 7) % 7) + 1 },
        (_, i) => (order[0]! + i) % 7,
      )
    : order;
  return new Set(indexes.map((i) => WEEK[i]![1]));
}

function tehranNow(now: Date): { day: number; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    get("weekday") ?? "",
  );
  return { day, hour: Number(get("hour")) + Number(get("minute")) / 60 };
}

/** «همین حالا آنلاین»: روز و ساعت تهران داخل یکی از ردیف‌ها. */
export function isOpenNow(now: Date, rows: BusinessHoursRow[]): boolean {
  const { day, hour } = tehranNow(now);
  const effective: {
    days: Set<number> | null;
    range: { from: number; to: number } | null;
  }[] =
    rows.length > 0
      ? rows.map((r) => ({
          days: parseDays(r.day),
          range: parseTimeRange(r.time),
        }))
      : [{ days: null, range: storeFacts.support.hours }];
  return effective.some(
    ({ days, range }) =>
      range !== null &&
      (days === null || days.has(day)) &&
      hour >= range.from &&
      hour < range.to,
  );
}

function fallbackTime(): string {
  const { from, to } = storeFacts.support.hours;
  return `${formatNumberFa(from)} تا ${formatNumberFa(to)}`;
}

/** ردیف‌های قابل نمایش (پیش‌فرض اگر پنل خالی است). */
export function displayRows(rows: BusinessHoursRow[]): BusinessHoursRow[] {
  return rows.length > 0 ? rows : [{ day: "همه‌روزه", time: fallbackTime() }];
}

/** یک جمله: «شنبه تا پنجشنبه از ۹:۳۰ تا ۱۸:۰۰». */
export function hoursSentence(rows: BusinessHoursRow[]): string {
  return displayRows(rows)
    .map((r) => `${r.day} از ${r.time}`)
    .join("، ");
}

/** شروع اولین بازه، برای «پاسخ‌گویی از ساعت …». */
export function openingTime(rows: BusinessHoursRow[]): string {
  const range = parseTimeRange(displayRows(rows)[0]?.time);
  if (!range) return formatNumberFa(storeFacts.support.hours.from);
  const h = Math.floor(range.from);
  const m = Math.round((range.from - h) * 60);
  const fa = (n: number, pad = 1) =>
    String(n)
      .padStart(pad, "0")
      .replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]!);
  return m ? `${fa(h)}:${fa(m, 2)}` : fa(h);
}
