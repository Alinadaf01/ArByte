export interface BusinessHour {
  day: string;
  time: string;
}

export interface AdminSiteSettings {
  businessName: string;
  economicCode: string;
  nationalId: string;
  phoneDisplay: string;
  phoneHref: string;
  email: string;
  address: string;
  businessHours: BusinessHour[];
  instagramUrl: string;
  telegramUrl: string;
  whatsappUrl: string;
  linkedinUrl: string;
  youtubeUrl: string;
  pinterestUrl: string;
  googleMapsEmbed: string;
  latitude: number | null;
  longitude: number | null;
  trustBadgeLabel: string;
  trustBadgeImage: string | null;
  trustBadgeImageUrl: string;
  trustBadgeUrl: string;
  paymentGatewayLabel: string;
  paymentGatewayImage: string | null;
  logoLight: string | null;
  logoDark: string | null;
  favicon: string | null;
  defaultOgImage: string | null;
  googleAnalyticsId: string;
  googleTagManagerId: string;
  ownerNotificationPhone: string;
  notifyOwnerNewOrder: boolean;
  postalCode: string;
  testPeriodDays: number;
  warrantyTerms: string;
  cardToCardActive: boolean;
  cardToCardHolderName: string;
  cardToCardNumber: string;
  cardToCardSheba: string;
}

export type ApiCredentialService =
  "kavenegar" | "zarinpal" | "idpay" | "snapppay" | "digipay";

export const API_CREDENTIAL_SERVICE_LABELS: Record<
  ApiCredentialService,
  string
> = {
  kavenegar: "کاوه‌نگار (پیامک)",
  zarinpal: "زرین‌پال",
  idpay: "آیدی‌پی",
  snapppay: "اسنپ‌پی",
  digipay: "دیجی‌پی",
};

export interface ApiCredential {
  id: string;
  service: ApiCredentialService;
  label: string;
  isActive: boolean;
  isSandbox: boolean;
  order: number;
  isConfigured: boolean;
  /** F-01 §۴ — فقط «••••» + ۴ نویسه‌ی آخر هر کلید؛ مقدار کامل هرگز برنمی‌گردد. */
  maskedCredentials: Record<string, string>;
}

export interface SmsTemplate {
  id: string;
  key: string;
  title: string;
  isActive: boolean;
  kavenegarTemplateName: string;
  kavenegarTokenMap: Record<string, string>;
}

export interface SmsLog {
  id: string;
  phone: string;
  templateKey: string | null;
  kavenegarTemplateName: string;
  status: "queued" | "sent" | "failed";
  error: string;
  createdAt: string;
}

export interface ShippingMethod {
  id: string;
  name: string;
  cost: number;
  freeAbove: number | null;
  estimatedDays: string;
  isActive: boolean;
  order: number;
}
