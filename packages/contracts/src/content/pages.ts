import { z } from "zod";
import {
  PaginatedApiMetaSchema,
  paginatedResponseSchema,
  successResponseSchema,
} from "../common/response";

/**
 * G-01 — API عمومی محتوا. متن‌ها فقط از پنل می‌آیند؛ رشته/آرایه‌ی خالی
 * یعنی فروشگاه آن بخش را پنهان کند (هیچ متن پیش‌فرضی در فروشگاه نیست).
 */

export const BLOG_CATEGORIES = [
  "راهنمای خرید",
  "بررسی",
  "مقایسه",
  "نگهداری",
  "گیمینگ",
] as const;
export const BlogCategorySchema = z.enum(BLOG_CATEGORIES);
export type BlogCategory = z.infer<typeof BlogCategorySchema>;

export const BlogPostCardSchema = z.object({
  slug: z.string(),
  title: z.string(),
  excerpt: z.string(),
  category: BlogCategorySchema,
  cover: z.object({ url: z.string().nullable(), alt: z.string() }).nullable(),
  author: z.string(),
  readingTime: z.number().int().positive(),
  publishedAt: z.string().nullable(),
});
export type BlogPostCard = z.infer<typeof BlogPostCardSchema>;

/** `html` از قبل سمت سرور sanitize شده (فقط تگ‌های متنی/لینک/تصویر مجاز). */
export const BlogSectionSchema = z.object({
  id: z.string(),
  heading: z.string(),
  html: z.string(),
});

export const BlogPostDetailSchema = BlogPostCardSchema.extend({
  authorRole: z.string(),
  tags: z.array(z.string()),
  sections: z.array(BlogSectionSchema),
  seo: z.object({
    title: z.string().nullable(),
    description: z.string().nullable(),
  }),
  updatedAt: z.string(),
  related: z.array(BlogPostCardSchema),
});
export type BlogPostDetail = z.infer<typeof BlogPostDetailSchema>;

export const BlogListResponseSchema =
  paginatedResponseSchema(BlogPostCardSchema);
export const BlogDetailResponseSchema =
  successResponseSchema(BlogPostDetailSchema);
export const BlogCategoriesResponseSchema = successResponseSchema(
  z.array(z.object({ name: BlogCategorySchema, count: z.number().int() })),
);

export const AboutContentSchema = z.object({
  hero: z.object({ title: z.string(), body: z.string() }),
  story: z.object({ title: z.string(), paragraphs: z.array(z.string()) }),
  principles: z.object({
    title: z.string(),
    items: z.array(z.object({ title: z.string(), body: z.string() })),
  }),
  timeline: z.object({
    title: z.string(),
    items: z.array(z.object({ year: z.string(), note: z.string() })),
  }),
  team: z.object({
    title: z.string(),
    members: z.array(z.object({ name: z.string(), role: z.string() })),
  }),
});
export type AboutContent = z.infer<typeof AboutContentSchema>;
export const AboutResponseSchema = successResponseSchema(AboutContentSchema);

export const LEGAL_DOCUMENT_KEYS = [
  "terms",
  "privacy",
  "shipping",
  "returns",
  "warranty",
] as const;
export const LegalDocumentSchema = z.object({
  key: z.enum(LEGAL_DOCUMENT_KEYS),
  title: z.string(),
  blocks: z.array(
    z.object({ heading: z.string(), paragraphs: z.array(z.string()) }),
  ),
  updatedAt: z.string(),
});
export type LegalDocument = z.infer<typeof LegalDocumentSchema>;
export const LegalResponseSchema = successResponseSchema(
  z.array(LegalDocumentSchema),
);

export const CONTACT_TOPICS = [
  "پیش از خرید",
  "سفارش و ارسال",
  "گارانتی و خدمات",
  "ارتقای رم و SSD",
  "خرید سازمانی",
] as const;
export const ContactRequestSchema = z.object({
  name: z.string().min(2),
  phone: z.string().regex(/^09\d{9}$/),
  topic: z.enum(CONTACT_TOPICS),
  orderNumber: z.string().max(30).optional(),
  message: z.string().min(10),
});
export type ContactRequest = z.infer<typeof ContactRequestSchema>;
export const ContactResponseSchema = successResponseSchema(
  z.object({ trackingCode: z.string() }),
);

export const RatingSummarySchema = z.object({
  average: z.number().nullable(),
  count: z.number().int(),
});
export type RatingSummary = z.infer<typeof RatingSummarySchema>;

export const ProductReviewSchema = z.object({
  id: z.string(),
  rating: z.number().int().min(1).max(5),
  title: z.string(),
  body: z.string(),
  authorName: z.string(),
  verifiedPurchase: z.boolean(),
  adminReply: z.string().nullable(),
  createdAt: z.string(),
});
export type ProductReview = z.infer<typeof ProductReviewSchema>;
export const ProductReviewsResponseSchema = z.object({
  data: z.array(ProductReviewSchema),
  meta: PaginatedApiMetaSchema.extend({
    rating: RatingSummarySchema,
    viewer: z.object({ canReview: z.boolean(), hasReviewed: z.boolean() }),
  }),
});
export type ProductReviewsResponse = z.infer<
  typeof ProductReviewsResponseSchema
>;
export const CreateReviewRequestSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(150).optional(),
  body: z.string().min(10),
});

/** G-01 — `GET /content/site-info`؛ null/خالی = آن تکه در فروشگاه پنهان. */
export const SiteInfoSchema = z.object({
  phone: z.object({ display: z.string(), href: z.string() }).nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  businessHours: z.array(z.object({ day: z.string(), time: z.string() })),
  socials: z.object({
    instagram: z.string().optional(),
    telegram: z.string().optional(),
    whatsapp: z.string().optional(),
    linkedin: z.string().optional(),
    youtube: z.string().optional(),
  }),
  trustBadge: z
    .object({
      imageUrl: z.string(),
      url: z.string().nullable(),
      label: z.string(),
    })
    .nullable(),
});
export type SiteInfo = z.infer<typeof SiteInfoSchema>;
export const SiteInfoResponseSchema = successResponseSchema(SiteInfoSchema);

/** G-02 — `GET /seo/redirects` (جدول middleware فروشگاه) و `GET /seo/sitemap`. */
export const RedirectRuleSchema = z.object({
  id: z.string(),
  from: z.string().startsWith("/"),
  to: z.string(),
  status: z.union([z.literal(301), z.literal(302)]),
});
export const RedirectListResponseSchema = successResponseSchema(
  z.array(RedirectRuleSchema),
);

const SitemapEntrySchema = z.object({
  slug: z.string(),
  updatedAt: z.string(),
});
export const SitemapDataResponseSchema = successResponseSchema(
  z.object({
    products: z.array(SitemapEntrySchema),
    categories: z.array(SitemapEntrySchema),
    posts: z.array(SitemapEntrySchema),
  }),
);
