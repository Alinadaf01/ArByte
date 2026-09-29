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
  /** E-05 §۳ — «عضو از» (Account.dc.html). فقط `GET/PATCH
   * /account/profile` این را برمی‌گرداند، نه پاسخ ورود (`AuthUserSchema`). */
  memberSince: z.string().datetime(),
});
export type Profile = z.infer<typeof ProfileSchema>;
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
export type Address = z.infer<typeof AddressSchema>;
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

/**
 * E-05 §۳ — «دستگاه‌های من»، جدید در قرارداد: یک ردیف به ازای هر
 * `OrderItemUnit` از سفارش‌های DELIVERED کاربر (E-03/E-04). تاریخ‌ها
 * رشته‌ی فارسی از پیش‌فرمت‌شده‌اند (همان `format_jalali_date_fa` سمت سرور
 * که کارت گارانتی هم استفاده می‌کند) نه ISO خام — این صفحه فقط نمایش
 * می‌دهد، محاسبه‌ای روی آن انجام نمی‌شود.
 */
export const DeviceSchema = z.object({
  orderNumber: z.string(),
  certificateId: z.string(),
  productName: z.string(),
  serialNumber: z.string().nullable(),
  /** null یعنی هنوز DELIVERED نشده (نمی‌شود چون این فهرست فقط DELIVERED
   * است) یا مهلت تست تعریف نشده — عملاً همیشه پر است اینجا. */
  testPeriodEndDate: z.string().nullable(),
  hasWarranty: z.boolean(),
  /** `hasWarranty` false → همیشه null («بدون گارانتی جدا»، UI). */
  warrantyEndDate: z.string().nullable(),
});
export type Device = z.infer<typeof DeviceSchema>;
export const DeviceListResponseSchema = successResponseSchema(
  z.array(DeviceSchema),
);
