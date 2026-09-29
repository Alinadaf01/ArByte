import { z } from "zod";

export const businessHourSchema = z.object({
  day: z.string().min(1, "روز الزامی است."),
  time: z.string().min(1, "ساعت الزامی است."),
});

export const siteSettingsFormSchema = z.object({
  businessName: z.string(),
  economicCode: z.string(),
  nationalId: z.string(),
  phoneDisplay: z.string(),
  phoneHref: z.string(),
  email: z.union([z.literal(""), z.string().email("ایمیل معتبر نیست.")]),
  address: z.string(),
  businessHours: z.array(businessHourSchema),
  instagramUrl: z.string(),
  telegramUrl: z.string(),
  whatsappUrl: z.string(),
  linkedinUrl: z.string(),
  youtubeUrl: z.string(),
  pinterestUrl: z.string(),
  googleMapsEmbed: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  trustBadgeLabel: z.string(),
  trustBadgeUrl: z.string(),
  paymentGatewayLabel: z.string(),
  googleAnalyticsId: z.string(),
  googleTagManagerId: z.string(),
  ownerNotificationPhone: z.string(),
  notifyOwnerNewOrder: z.boolean(),
  postalCode: z.union([
    z.literal(""),
    z.string().regex(/^\d{10}$/, "کد پستی ۱۰ رقم است."),
  ]),
  testPeriodDays: z.coerce
    .number()
    .int()
    .min(0, "مهلت تست نمی‌تواند منفی باشد."),
  warrantyTerms: z.string(),
  cardToCardActive: z.boolean(),
  cardToCardHolderName: z.string(),
  cardToCardNumber: z.union([
    z.literal(""),
    z.string().regex(/^\d{16}$/, "شماره کارت ۱۶ رقم بدون خط‌تیره است."),
  ]),
  cardToCardSheba: z.union([
    z.literal(""),
    z.string().regex(/^IR\d{24}$/, "شبا با IR و ۲۴ رقم است."),
  ]),
});

export type SiteSettingsFormValues = z.infer<typeof siteSettingsFormSchema>;

export const shippingMethodFormSchema = z.object({
  name: z.string().min(1, "نام الزامی است."),
  cost: z.coerce.number().int().min(0, "هزینه نمی‌تواند منفی باشد."),
  freeAbove: z.number().int().min(0).nullable(),
  estimatedDays: z.string(),
  isActive: z.boolean(),
  order: z.coerce.number().int().min(0),
});

export type ShippingMethodFormValues = z.infer<typeof shippingMethodFormSchema>;
