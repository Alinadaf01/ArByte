import { z } from "zod";
import { successResponseSchema } from "../common/response";
import {
  ProductConditionSchema,
  SpecificationTypeSchema,
} from "../common/enums";
import { MoneyAmountSchema, SlugSchema } from "../validators";
import { BrandRefSchema, CategoryRefSchema, SeoSchema } from "./common";

/**
 * `GET /catalog/categories` — درخت دسته‌بندی. §۸.۱۸/تصمیم ه (T-003): عمق
 * نامحدود در دیتابیس، پس این هم بازگشتی مدل شده (`z.lazy`).
 */
export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  children: CategoryTreeNode[];
}
export const CategoryTreeNodeSchema: z.ZodType<CategoryTreeNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    slug: SlugSchema,
    image: z.string().nullable(),
    children: z.array(CategoryTreeNodeSchema),
  }),
);
export const CategoryTreeResponseSchema = successResponseSchema(
  z.array(CategoryTreeNodeSchema),
);

/**
 * T-202 §۱.۱ — `CategoryRefSchema` عمداً سبک می‌ماند (در پاسخ محصول ده‌ها
 * بار تکرار می‌شود). این یکی جدا است، فقط برای جایی که دسته‌بندی به‌صورت
 * کارت نمایش داده می‌شود: گرید دسته‌بندی صفحه اصلی، فهرست زیردسته‌ها
 * (`GET /catalog/categories/:slug`)، صفحه‌ی `/categories`
 * (`GET /catalog/categories/top-level`).
 */
export const CategoryCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: SlugSchema,
  image: z.object({ url: z.string(), alt: z.string().nullable() }).nullable(),
  /** با `_count` روی رابطه‌ی products، نه کوئری جدا (§۱.۱ هشدار). */
  productCount: z.number().int().nonnegative(),
});
export type CategoryCard = z.infer<typeof CategoryCardSchema>;
export const CategoryTopLevelResponseSchema = successResponseSchema(
  z.array(CategoryCardSchema),
);

// GET /catalog/categories/:slug — T-202 §۱.۲، عمداً در T-150 ساخته نشده بود.
export const CategoryDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: SlugSchema,
  description: z.string().nullable(),
  imageMain: z.string().nullable(),
  imageBanner: z.string().nullable(),
  /** برای breadcrumb — ارجاع سبک کافی است. */
  parent: CategoryRefSchema.nullable(),
  /** زیردسته‌ها به‌صورت کارت (§۱.۱) — نه ارجاع سبک. */
  children: z.array(CategoryCardSchema),
  seo: SeoSchema,
});
export type CategoryDetail = z.infer<typeof CategoryDetailSchema>;
export const CategoryDetailResponseSchema =
  successResponseSchema(CategoryDetailSchema);

/**
 * `GET /catalog/filters?category=` — فیلترهای پویای دسته (§۶.۱۱). یک
 * Specification روی نوعش (SELECT/COLOR → options، NUMBER/RANGE →
 * numericRange) کدام شکل را پر می‌کند مشخص می‌شود؛ دقیقاً یکی از دو حاضر
 * است — کامنت مستند می‌کند، منطق پرکردن در پیاده‌سازی واقعی است.
 */
export const FilterOptionSchema = z.object({
  value: z.string(),
  count: z.number().int().nonnegative(),
});
export const FilterDefinitionSchema = z.object({
  specDefId: z.string(),
  name: z.string(),
  type: SpecificationTypeSchema,
  unit: z.string().nullable(),
  /** برای SELECT/MULTI_SELECT/COLOR. */
  options: z.array(FilterOptionSchema).optional(),
  /** برای NUMBER/RANGE. */
  numericRange: z.object({ min: z.number(), max: z.number() }).optional(),
});

export const CatalogFiltersQuerySchema = z.object({ category: SlugSchema });
export type CatalogFiltersQuery = z.infer<typeof CatalogFiltersQuerySchema>;
export const CatalogFiltersResponseSchema = successResponseSchema(
  z.object({
    specs: z.array(FilterDefinitionSchema),
    priceRange: z.object({ min: MoneyAmountSchema, max: MoneyAmountSchema }),
    brands: z.array(BrandRefSchema),
    conditions: z.array(ProductConditionSchema),
  }),
);
