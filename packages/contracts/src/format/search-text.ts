import { toLatinDigits } from "./digits";

const ARABIC_YEH = /ي/g; // ي
const ARABIC_KAF = /ك/g; // ك
// اعراب (فتحه/ضمه/کسره/تنوین/تشدید/سکون/الف مقصوره‌ی بالانویس) + کشیده (تتویل)
const DIACRITICS_AND_TATWEEL = /[ً-ْٰـ]/g;
const ZWNJ_AND_WHITESPACE = /[‌\s]/g; // نیم‌فاصله + هر نوع فاصله

/**
 * T-215 §۱ — نرمال‌سازی متن جستجوی فارسی، هم برای `GET /catalog/search`
 * (apps/api) هم نمایه‌ی ایستای راهنما (apps/web). هدف: «لپتاپ» (بدون
 * نیم‌فاصله) و «لپ‌تاپ» (با نیم‌فاصله) و «لپ‌تاپ» با «ي»/«ك» عربی همه یک
 * نتیجه بدهند.
 */
export function normalizeSearchText(input: string): string {
  return toLatinDigits(input)
    .replace(ARABIC_YEH, "ی")
    .replace(ARABIC_KAF, "ک")
    .replace(DIACRITICS_AND_TATWEEL, "")
    .replace(ZWNJ_AND_WHITESPACE, "")
    .toLowerCase();
}
