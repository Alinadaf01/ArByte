import { z } from "zod";
import { successResponseSchema } from "../common/response";
import { CategoryRefSchema } from "../catalog/common";
import { ProductCardSchema } from "../catalog/product";

/**
 * `GET /content/homepage` — عمومی. الحاقیه T-004 §۸، هشدار: پاسخ باید
 * **محتوای حل‌شده** بدهد، نه ارجاع — اگر بلوک PRODUCT_RAIL است، خود
 * محصولات (با همان شکل کارت فهرست، `catalog/product.ts`) در پاسخ‌اند، نه
 * فهرست `productId`. یک درخواست، یک پاسخ.
 *
 * فقط PRODUCT_RAIL و CATEGORY_GRID رزولوشن مشخصی در الحاقیه دارند؛ بقیه‌ی
 * انواع (HERO/CAMPAIGN/BENEFITS/BLOG_RAIL) فعلاً محتوای پایه (متن/تصویر/CTA)
 * دارند — رزولوشن غنی‌تر برای CAMPAIGN (محصولات کمپین) و BLOG_RAIL (پست‌های
 * وبلاگ) چون این دو دامنه هنوز در فهرست صریح اندپوینت‌های T-004 نیستند،
 * عمداً به تسک بعدی موکول شده (رک. docs/api/README.md).
 */
const HomepageBlockBaseSchema = z.object({
  id: z.string(),
  sortOrder: z.number().int(),
  title: z.string().nullable(),
  subtitle: z.string().nullable(),
  ctaLabel: z.string().nullable(),
  ctaUrl: z.string().nullable(),
  imageDesktop: z.string().nullable(),
  imageMobile: z.string().nullable(),
  imageAlt: z.string().nullable(),
});

export const PublicHomepageBlockSchema = z.discriminatedUnion("type", [
  HomepageBlockBaseSchema.extend({ type: z.literal("HERO") }),
  HomepageBlockBaseSchema.extend({
    type: z.literal("CATEGORY_GRID"),
    categories: z.array(CategoryRefSchema),
  }),
  HomepageBlockBaseSchema.extend({
    type: z.literal("PRODUCT_RAIL"),
    products: z.array(ProductCardSchema),
  }),
  HomepageBlockBaseSchema.extend({ type: z.literal("CAMPAIGN") }),
  HomepageBlockBaseSchema.extend({ type: z.literal("BENEFITS") }),
  HomepageBlockBaseSchema.extend({ type: z.literal("BLOG_RAIL") }),
]);
export type PublicHomepageBlock = z.infer<typeof PublicHomepageBlockSchema>;

export const HomepageResponseSchema = successResponseSchema(
  z.object({ blocks: z.array(PublicHomepageBlockSchema) }),
);
