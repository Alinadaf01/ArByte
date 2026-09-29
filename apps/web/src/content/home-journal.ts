import type { BlogPostCard } from "@arbyte/contracts";

/**
 * G-01 — کارت‌های «پیش از خرید، بخوانید» حالا از API وبلاگ می‌آیند (تا ۹
 * نوشته‌ی آخر). رنگ کارت‌ها همان چرخه‌ی سه‌رنگ طراحی است. داده‌ی نمونه‌ی
 * طراحی (T-212) حذف شد: نوشته‌ی ساختگی نداریم.
 */
export type JournalVariant = "violet" | "dark" | "cyan";

export interface JournalCardData {
  slug: string;
  tag: string;
  title: string;
  readMinutes: number;
  variant: JournalVariant;
}

const VARIANTS: JournalVariant[] = ["violet", "dark", "cyan"];

export function toJournalCards(posts: BlogPostCard[]): JournalCardData[] {
  return posts.slice(0, 9).map((post, i) => ({
    slug: post.slug,
    tag: post.category,
    title: post.title,
    readMinutes: post.readingTime,
    variant: VARIANTS[i % VARIANTS.length]!,
  }));
}
