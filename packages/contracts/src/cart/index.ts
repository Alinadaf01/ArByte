import { z } from "zod";
import { successResponseSchema } from "../common/response";
import { MoneyAmountSchema } from "../validators";
import { PriceSchema } from "../catalog/variant";

/**
 * سبد خرید — T-004 §۳. §۸.۵۵: فرانت فقط `Product`(واریانت)/`Quantity`/
 * `Coupon` می‌فرستد؛ قیمتِ پاسخ همیشه لحظه‌ای از سرور خوانده می‌شود، هرگز
 * از کلاینت پذیرفته نمی‌شود — برای همین در بدنه‌ی درخواست هیچ فیلد قیمتی
 * نیست، فقط در پاسخ.
 */
export const CartItemVariantRefSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  productSlug: z.string(),
  label: z.string(),
  image: z.string().nullable(),
  price: PriceSchema,
});

export const CartItemSchema = z.object({
  id: z.string(),
  variant: CartItemVariantRefSchema,
  quantity: z.number().int().positive(),
  lineTotal: MoneyAmountSchema,
});
export type CartItem = z.infer<typeof CartItemSchema>;

export const CartSchema = z.object({
  id: z.string(),
  items: z.array(CartItemSchema),
  itemCount: z.number().int().nonnegative(),
  /** D-04 §۵ — سبد خالی جمع صفر دارد؛ برخلاف `lineTotal` (همیشه مثبت،
   * چون هر آیتم حداقل تعداد ۱ دارد)، اینجا نمی‌شود از `MoneyAmountSchema`
   * (positive) استفاده کرد. */
  subtotal: z.number().int().nonnegative(),
});
export type Cart = z.infer<typeof CartSchema>;

// GET /cart
export const CartResponseSchema = successResponseSchema(CartSchema);

// POST /cart/items
export const AddCartItemBodySchema = z.object({
  variantId: z.string(),
  quantity: z.number().int().positive(),
});

// PATCH /cart/items/:id
export const UpdateCartItemBodySchema = z.object({
  quantity: z.number().int().positive(),
});
