import { z } from "zod";
import { successResponseSchema } from "../common/response";
import {
  MobileSchema,
  MoneyAmountSchema,
  PostalCodeSchema,
} from "../validators";

/** حساب کاربری — T-004 §۳: پروفایل، آدرس‌ها، علاقه‌مندی. */

export const ProfileSchema = z.object({
  id: z.string(),
  mobile: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
});
export const ProfileResponseSchema = successResponseSchema(ProfileSchema);

export const UpdateProfileBodySchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
});

export const AddressSchema = z.object({
  id: z.string(),
  recipientName: z.string(),
  mobile: z.string(),
  province: z.string(),
  city: z.string(),
  addressLine: z.string(),
  postalCode: z.string().nullable(),
  /** §۸.۹ — همیشه دقیقاً یکی برابر true است (پارشال یونیک، T-003). */
  isDefault: z.boolean(),
});
export const AddressListResponseSchema = successResponseSchema(
  z.array(AddressSchema),
);
export const AddressResponseSchema = successResponseSchema(AddressSchema);

export const CreateAddressBodySchema = z.object({
  recipientName: z.string().min(1).max(100),
  mobile: MobileSchema,
  province: z.string().min(1),
  city: z.string().min(1),
  addressLine: z.string().min(1).max(500),
  postalCode: PostalCodeSchema.optional(),
  isDefault: z.boolean().optional(),
});
export const UpdateAddressBodySchema = CreateAddressBodySchema.partial();

export const WishlistItemSchema = z.object({
  id: z.string(),
  product: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    image: z.string().nullable(),
  }),
  variantId: z.string().nullable(),
  /** D-04 §۲ — قیمت لحظه‌ی ذخیره؛ صفحه‌ی /wishlist تغییر قیمت را از این و
   * قیمت زنده‌ی واریانت حساب می‌کند. نال یعنی محصول موقع ذخیره قیمتی نداشت. */
  priceAtSave: MoneyAmountSchema.nullable(),
  createdAt: z.string().datetime(),
});
export const WishlistResponseSchema = successResponseSchema(
  z.array(WishlistItemSchema),
);

export const AddWishlistItemBodySchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
});

/**
 * D-04 §۲ — جدید در قرارداد: POST /account/wishlist/merge، برای انتقال
 * علاقه‌مندی محلی (localStorage، قبل از ورود) به حساب کاربر بعد از ورود.
 * با productSlug شناسایی می‌شود، نه id — localStorage قبل از ورود فقط
 * slug دارد (apps/web/src/lib/stores/wishlist-store.ts). آیتمی که از قبل
 * در حساب کاربر بود دست نمی‌خورد (merge، نه overwrite).
 */
export const MergeWishlistItemSchema = z.object({
  productSlug: z.string(),
  variantId: z.string().optional(),
  priceAtSave: MoneyAmountSchema.optional(),
});
export const MergeWishlistBodySchema = z.array(MergeWishlistItemSchema);
export const MergeWishlistResponseSchema = WishlistResponseSchema;
