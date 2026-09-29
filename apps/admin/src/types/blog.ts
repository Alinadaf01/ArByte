export interface BlogSection {
  id: string;
  heading: string;
  body: string;
}

export const BLOG_CATEGORIES = [
  "راهنمای خرید",
  "بررسی",
  "مقایسه",
  "نگهداری",
  "گیمینگ",
] as const;

export interface AdminBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  sections: BlogSection[];
  coverImage: string | null;
  coverAlt: string;
  resolvedCoverUrl: string;
  author: string;
  authorRole: string;
  tags: string[];
  readingTime: number;
  isPublished: boolean;
  metaTitle: string;
  metaDescription: string;
  publishedAt: string | null;
}

export interface BlogPostFormValues {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  sections: BlogSection[];
  author: string;
  authorRole: string;
  tags: string;
  readingTime: number;
  coverAlt: string;
  isPublished: boolean;
  metaTitle: string;
  metaDescription: string;
}
