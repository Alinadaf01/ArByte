import { z } from "zod";
import {
  successResponseSchema,
  paginatedResponseSchema,
} from "../common/response";
import { PaginationQuerySchema } from "../common/pagination";
import { ProductConditionSchema, ProductSortSchema } from "../common/enums";
import { MoneyAmountSchema, SlugSchema } from "../validators";
import {
  BrandRefSchema,
  CategoryRefSchema,
  ProductImageSchema,
  SeoSchema,
} from "./common";
import {
  ProductCardVariantSchema,
  PublicVariantSchema,
  VariantAxisSchema,
} from "./variant";

/**
 * `GET /catalog/products/:slug` — الحاقیه §۱، شکل کامل. محصول بدون
 * پیکربندی هم دقیقاً همین ساختار است: یک واریانت، `variantAxes: []`
 * (هیچ شاخه‌ی «دارد/ندارد» در فرانت لازم نیست).
 */
export const SpecificationItemSchema = z.object({
  name: z.string(),
  value: z.string(),
});
export const SpecificationGroupSchema = z.object({
  groupName: z.string(),
  items: z.array(SpecificationItemSchema),
});

export const PublicProductDetailSchema = z.object({
  id: z.string(),
  slug: SlugSchema,
  name: z.string(),
  brand: BrandRefSchema,
  category: CategoryRefSchema,
  condition: ProductConditionSchema,
  images: z.array(ProductImageSchema),
  description: z.string().nullable(),

  defaultVariantId: z.string(),
  /** کدام مشخصات پیکربندی‌ها را جدا می‌کنند؛ محصول بدون پیکربندی = آرایه‌ی خالی. */
  variantAxes: z.array(VariantAxisSchema),
  variants: z.array(PublicVariantSchema).min(1),
  /** مشخصات مشترک بین همه‌ی واریانت‌ها. */
  specifications: z.array(SpecificationGroupSchema),

  seo: SeoSchema,
});
export type PublicProductDetail = z.infer<typeof PublicProductDetailSchema>;

export const ProductDetailResponseSchema = successResponseSchema(
  PublicProductDetailSchema,
);

/**
 * `GET /catalog/products` — کارت فهرست. الحاقیه §۲: تصمیم پذیرفته‌شده
 * («این را در گزارش تأیید بگیر») بدون پرسش از کاربر طبق دستور صریح او
 * برای T-004 اجرا شد — قیمت واریانت پیش‌فرض + `hasMultipleVariants` +
 * `variantCount`. فرانت فعلاً hasMultipleVariants را نادیده می‌گیرد؛ اگر
 * بعداً «از N تومان» لازم شد، API از قبل آماده است و تغییری نمی‌خواهد.
 *
 * الحاقیه §۳: وقتی فیلتر مشخصه‌ی محور فعال است (spec[<axisId>])،
 * defaultVariant باید اولین واریانت *منطبق* باشد، نه واریانت پیش‌فرض واقعی
 * محصول — وگرنه کاربر روی یک قیمت کلیک می‌کند و صفحه با قیمت دیگری باز
 * می‌شود. نام فیلد همچنان `defaultVariant` است (شکل پاسخ الحاقیه)، اما
 * منبعش شرطی است؛ منطق انتخاب در catalog/variant-selection.ts (توضیح
 * کامل آنجا).
 */
export const ProductCardSchema = z.object({
  id: z.string(),
  slug: SlugSchema,
  name: z.string(),
  brand: BrandRefSchema,
  category: CategoryRefSchema,
  condition: ProductConditionSchema,
  image: ProductImageSchema.nullable(),
  defaultVariant: ProductCardVariantSchema,
  hasMultipleVariants: z.boolean(),
  variantCount: z.number().int().positive(),
});
export type ProductCard = z.infer<typeof ProductCardSchema>;

/**
 * `GET /catalog/products` پارامترها — سند اصلی §۳ + الحاقیه §۳ (بازه‌ی
 * قیمت روی واریانت اعمال می‌شود، نه محصول؛ کلید معنایش عوض نمی‌شود اما
 * پیاده‌سازی باید این را بداند — مستند در docs/api/README.md).
 * `spec` کلیدهای پویا دارد (`spec[<specDefId>]=value`)؛ Query string با
 * این شکل به `{ spec: { "<id>": "value" } }` parse می‌شود.
 */
export const ProductListQuerySchema = PaginationQuerySchema.extend({
  category: SlugSchema.optional(),
  brand: SlugSchema.optional(),
  condition: ProductConditionSchema.optional(),
  minPrice: MoneyAmountSchema.optional(),
  maxPrice: MoneyAmountSchema.optional(),
  spec: z.record(z.string(), z.string()).optional(),
  availability: z.enum(["IN_STOCK", "PREORDER"]).optional(),
  sort: ProductSortSchema.default("newest"),
});
export type ProductListQuery = z.infer<typeof ProductListQuerySchema>;

export const ProductListResponseSchema =
  paginatedResponseSchema(ProductCardSchema);

// GET /catalog/search?q=
export const SearchQuerySchema = PaginationQuerySchema.extend({
  q: z.string().min(1),
});
export const SearchResponseSchema = paginatedResponseSchema(ProductCardSchema);
