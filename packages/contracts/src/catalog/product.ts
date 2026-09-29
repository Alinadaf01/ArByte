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
export type SpecificationItem = z.infer<typeof SpecificationItemSchema>;
export const SpecificationGroupSchema = z.object({
  groupName: z.string(),
  items: z.array(SpecificationItemSchema),
});
export type SpecificationGroup = z.infer<typeof SpecificationGroupSchema>;

export const PublicProductDetailSchema = z.object({
  id: z.string(),
  slug: SlugSchema,
  name: z.string(),
  brand: BrandRefSchema,
  category: CategoryRefSchema,
  condition: ProductConditionSchema,
  images: z.array(ProductImageSchema),
  /** T-214 §۱ — زیرعنوان کوتاه زیر h1؛ از `description` (بررسی چندپاراگرافی تب) جداست. */
  shortDescription: z.string().nullable(),
  description: z.string().nullable(),

  defaultVariantId: z.string(),
  /** کدام مشخصات پیکربندی‌ها را جدا می‌کنند؛ محصول بدون پیکربندی = آرایه‌ی خالی. */
  variantAxes: z.array(VariantAxisSchema),
  variants: z.array(PublicVariantSchema).min(1),
  /** مشخصات مشترک بین همه‌ی واریانت‌ها. */
  specifications: z.array(SpecificationGroupSchema),

  seo: SeoSchema,
  /** G-01 — خلاصه‌ی نظرهای تأییدشده؛ AggregateRating فقط با count ≥ ۳. */
  rating: z.object({ average: z.number().nullable(), count: z.number().int() }),
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
  /** T-150 — گپ سند تسک/قرارداد: کارت طراحی حداکثر چهار مشخصه نشان می‌دهد؛
   * قرارداد اولیه‌ی T-004 این فیلد را نداشت (تصمیم مدیر پروژه: اضافه شود). */
  keySpecs: z.array(SpecificationItemSchema).max(4),
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
/** T-150 §۶ — سقف perPage اینجا ۶۰ است (سختگیرانه‌تر از ۱۰۰ عمومیِ
 * PaginationQuerySchema)، فقط برای فهرست کاتالوگ عمومی — پرفورمنس صریح
 * سند تسک. اسکیمای مشترک برای دامنه‌های ادمین دست‌نخورده می‌ماند. */
export const ProductListQuerySchema = PaginationQuerySchema.extend({
  perPage: z.coerce.number().int().positive().max(60).default(24),
  category: SlugSchema.optional(),
  /**
   * T-213 §۳ — چندانتخابی («MSI,ASUS» در URL). رشته‌ی کاما-جداشده قبل از
   * اعتبارسنجی هر تکه به آرایه تبدیل می‌شود؛ خالی/فقط-کاما یعنی بدون فیلتر.
   */
  brand: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").filter(Boolean) : undefined))
    .pipe(z.array(SlugSchema).optional()),
  condition: ProductConditionSchema.optional(),
  minPrice: MoneyAmountSchema.optional(),
  maxPrice: MoneyAmountSchema.optional(),
  spec: z.record(z.string(), z.string()).optional(),
  availability: z.enum(["IN_STOCK", "PREORDER"]).optional(),
  /** T-213 §۶ — پیش‌فرض فروشگاه «پیشنهاد آربایت» است، نه جدیدترین. */
  sort: ProductSortSchema.default("featured"),
});
export type ProductListQuery = z.infer<typeof ProductListQuerySchema>;

export const ProductListResponseSchema =
  paginatedResponseSchema(ProductCardSchema);

// GET /catalog/search?q=
export const SearchQuerySchema = PaginationQuerySchema.extend({
  perPage: z.coerce.number().int().positive().max(60).default(24),
  q: z.string().min(1),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export const SearchResponseSchema = paginatedResponseSchema(ProductCardSchema);
