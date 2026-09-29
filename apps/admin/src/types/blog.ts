export interface BlogSection {
  id: string;
  heading: string;
  body: string;
}

export const BLOG_CATEGORIES = [
  "محصول",
  "طراحی",
  "آموزش",
  "سبک زندگی",
  "جامعه",
] as const;

export interface AdminBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  sections: BlogSection[];
  coverImage: string | null;
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
  isPublished: boolean;
  metaTitle: string;
  metaDescription: string;
}
