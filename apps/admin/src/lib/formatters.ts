import { toJalaali } from "jalaali-js";

// Same implementation as the storefront's src/lib/formatters.ts — duplicated
// rather than cross-imported (see api.ts's header comment). formatDimensions
// isn't included yet since no admin page needs it until A2's product form.

const persianMonths = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

export function formatPrice(value: number): string {
  return `${value.toLocaleString("en-US")} تومان`;
}

export function formatJalaliDate(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const { jy, jm, jd } = toJalaali(date);
  return `${jd} ${persianMonths[jm - 1]} ${jy}`;
}

export function formatJalaliDateTime(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${formatJalaliDate(date)} · ${hours}:${minutes}`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`;
}

export function formatRelativeTime(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "همین الان";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes.toLocaleString("fa-IR")} دقیقه پیش`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours.toLocaleString("fa-IR")} ساعت پیش`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days.toLocaleString("fa-IR")} روز پیش`;
  return formatJalaliDate(date);
}
