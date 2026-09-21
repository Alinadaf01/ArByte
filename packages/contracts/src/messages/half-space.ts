/**
 * تشخیص خطاهای رایج نیم‌فاصله (§۲.۱۲) — جای فاصله‌ی معمولی، باید ZWNJ
 * (U+200C) بیاید. این یک تحلیل‌گر صرفی کامل نیست؛ فقط پرتکرارترین خطاها
 * (پیشوند می/نمی + فعل) را روی متن‌های پیام‌های خودمان می‌گیرد.
 */

const ZWNJ = "‌";

const VERB_STEMS = [
  "شود",
  "شوند",
  "کند",
  "کنند",
  "کنیم",
  "دهد",
  "دهند",
  "رود",
  "روند",
  "آید",
  "آیند",
  "توان",
  "گیرد",
  "ماند",
  "باشد",
];

const PREFIXES = ["می", "نمی"];

interface HalfSpaceIssue {
  wrong: string;
  correct: string;
}

const WRONG_PATTERNS: HalfSpaceIssue[] = PREFIXES.flatMap((prefix) =>
  VERB_STEMS.map((stem) => ({
    wrong: `${prefix} ${stem}`,
    correct: `${prefix}${ZWNJ}${stem}`,
  })),
);

export function findHalfSpaceIssues(text: string): HalfSpaceIssue[] {
  return WRONG_PATTERNS.filter((pattern) => text.includes(pattern.wrong));
}
