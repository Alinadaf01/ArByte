import { z } from "zod";
import {
  successResponseSchema,
  paginatedResponseSchema,
} from "../common/response";
import { PaginationQuerySchema } from "../common/pagination";
import {
  PriceModelSchema,
  ProductConditionSchema,
  ProductStatusSchema,
  ProfitTypeSchema,
} from "../common/enums";
import { MoneyAmountSchema, SlugSchema } from "../validators";

/**
 * محصول — نمای ادمین. ⚠️ الحاقیه T-004 §۴: این فایل عمداً کاملاً جدا از
 * catalog/product.ts نوشته شده — هیچ `.omit()` از این یکی برای ساختن
 * عمومی، و برعکس. `supplierPrice`/`profitType`/`profitAmountToman`/
 * `profitPercentBasisPoints` **فقط اینجا** هستند.
 */
export const AdminProductVariantSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string().nullable(),
  isDefault: z.boolean(),
  priceModel: PriceModelSchema,
  /** ⚠️ حساس — هرگز در پاسخ عمومی. */
  supplierPrice: MoneyAmountSchema.nullable(),
  profitType: ProfitTypeSchema.nullable(),
  profitAmountToman: MoneyAmountSchema.nullable(),
  profitPercentBasisPoints: z.number().int().nonnegative().nullable(),
  finalPrice: MoneyAmountSchema,
  compareAtPrice: MoneyAmountSchema.nullable(),
  deletedAt: z.string().datetime().nullable(),
});
export type AdminProductVariant = z.infer<typeof AdminProductVariantSchema>;

export const AdminProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  brandId: z.string(),
  categoryId: z.string(),
  modelNumber: z.string().nullable(),
  gtin: z.string().nullable(),
  partNumber: z.string().nullable(),
  description: z.string().nullable(),
  shortDescription: z.string().nullable(),
  condition: ProductConditionSchema,
  status: ProductStatusSchema,
  isVisibleOnSite: z.boolean(),
  isVisibleInSearch: z.boolean(),
  isVisibleInCategory: z.boolean(),
  priority: z.number().int(),
  variants: z.array(AdminProductVariantSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});
export type AdminProduct = z.infer<typeof AdminProductSchema>;

// GET /admin/products
export const AdminProductListQuerySchema = PaginationQuerySchema.extend({
  category: z.string().optional(),
  brand: z.string().optional(),
  status: ProductStatusSchema.optional(),
  q: z.string().optional(),
});
export const AdminProductListItemSchema = AdminProductSchema.omit({
  variants: true,
}).extend({
  variantCount: z.number().int().nonnegative(),
  defaultVariant: AdminProductVariantSchema.nullable(),
});
export const AdminProductListResponseSchema = paginatedResponseSchema(
  AdminProductListItemSchema,
);

// GET /admin/products/:id
export const AdminProductDetailResponseSchema =
  successResponseSchema(AdminProductSchema);

/**
 * `POST /admin/products` — الحاقیه بخش ۱: هر محصول حداقل یک Variant دارد؛
 * محصول بدون پیکربندی یعنی یک واریانت پیش‌فرض در همین بدنه.
 */
export const CreateProductVariantBodySchema = z.object({
  sku: z.string().min(1),
  name: z.string().optional(),
  isDefault: z.boolean().default(false),
  priceModel: PriceModelSchema,
  supplierPrice: MoneyAmountSchema.optional(),
  profitType: ProfitTypeSchema.optional(),
  profitAmountToman: MoneyAmountSchema.optional(),
  profitPercentBasisPoints: z.number().int().nonnegative().optional(),
  finalPrice: MoneyAmountSchema,
  compareAtPrice: MoneyAmountSchema.optional(),
});

export const CreateProductBodySchema = z.object({
  name: z.string().min(1).max(300),
  slug: SlugSchema.optional(), // اگر نیاید، سرور با slugify() از name می‌سازد
  brandId: z.string(),
  categoryId: z.string(),
  modelNumber: z.string().optional(),
  gtin: z.string().optional(),
  partNumber: z.string().optional(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  condition: ProductConditionSchema,
  status: ProductStatusSchema.default("ACTIVE"),
  priority: z.number().int().default(0),
  variants: z.array(CreateProductVariantBodySchema).min(1),
});

export const UpdateProductBodySchema = CreateProductBodySchema.omit({
  variants: true,
}).partial();
export const UpdateProductVariantBodySchema =
  CreateProductVariantBodySchema.partial();
