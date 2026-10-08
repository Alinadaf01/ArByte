/** F-02 — شکل پاسخ‌های کاتالوگ پنل روی مدل واریانت آربایت (docs/api/ADMIN.md). */

export type ProductCondition = "NEW" | "OPEN_BOX" | "STOCK" | "LIKE_NEW";
export type ProductStatus = "ACTIVE" | "INACTIVE";
/** از «condition» جداست — درجه‌ی کیفیت داخلی تیم فروش؛ محصول می‌تواند بدون گرید باشد. */
export type ProductGrade =
  | "A"
  | "A+"
  | "A++"
  | "A+++"
  | "B"
  | "B+"
  | "OPENBOX"
  | "KY.PEN.A"
  | "KY.PEN.A+"
  | "BOX"
  | "A++BOX";

/** برچسب‌ها همان enum-labels فروشگاه (بریف E-04 اصلاح ۶). */
export const CONDITION_LABELS: Record<ProductCondition, string> = {
  NEW: "آکبند",
  OPEN_BOX: "اپن باکس",
  STOCK: "استوک",
  LIKE_NEW: "در حد نو",
};

/** کدهای گرید خودشان لیبل‌اند — همان چیزی که تیم فروش استفاده می‌کند. */
export const GRADE_OPTIONS: ProductGrade[] = [
  "A",
  "A+",
  "A++",
  "A+++",
  "B",
  "B+",
  "OPENBOX",
  "KY.PEN.A",
  "KY.PEN.A+",
  "BOX",
  "A++BOX",
];

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  parent: number | null;
  description: string | null;
  imageMain: string | null;
  imageBanner: string | null;
  imageThumbnail: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface AdminBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  isActive: boolean;
  productsCount: number;
}

export interface AdminProductListItem {
  id: string;
  name: string;
  slug: string;
  brand: { id: string; name: string };
  category: { id: string; name: string };
  condition: ProductCondition;
  grade: ProductGrade | null;
  isPresale: boolean;
  status: ProductStatus;
  isVisibleOnSite: boolean;
  priority: number;
  primaryImage: string | null;
  variantsCount: number;
  priceMin: number | null;
  priceMax: number | null;
  stockAvailable: number | null;
  skus: string[];
  updatedAt: string;
}

export interface ProductSeo {
  metaTitle: string | null;
  metaDescription: string | null;
  canonical: string | null;
  robots: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
}

export interface ProductImage {
  id: number;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  condition: ProductCondition;
  grade: ProductGrade | null;
  isPresale: boolean;
  status: ProductStatus;
  isVisibleOnSite: boolean;
  isVisibleInSearch: boolean;
  isVisibleInCategory: boolean;
  priority: number;
  shortDescription: string | null;
  description: string | null;
  modelNumber: string | null;
  gtin: string | null;
  partNumber: string | null;
  warrantyMonths: number | null;
  warrantyProvider: string | null;
  requiresSerial: boolean;
  shippingNote: string | null;
  returnPolicyNote: string | null;
  seo: ProductSeo | null;
  images: ProductImage[];
  storefrontUrl: string;
  updatedAt: string;
}

export type ProductFormValues = Omit<
  AdminProduct,
  "id" | "images" | "storefrontUrl" | "updatedAt" | "seo"
> & {
  seo: ProductSeo;
};

export interface SpecValue {
  id: string;
  value: string;
  swatchHex: string | null;
  sortOrder?: number;
}

export type SpecType =
  | "TEXT"
  | "NUMBER"
  | "BOOLEAN"
  | "SELECT"
  | "MULTI_SELECT"
  | "RANGE"
  | "COLOR"
  | "DATE";

export const SPEC_TYPE_LABELS: Record<SpecType, string> = {
  TEXT: "متنی",
  NUMBER: "عددی",
  BOOLEAN: "بله/خیر",
  SELECT: "انتخابی",
  MULTI_SELECT: "چندانتخابی",
  RANGE: "بازه‌ای",
  COLOR: "رنگ",
  DATE: "تاریخ",
};

export interface SpecDefinition {
  id: string;
  key: string;
  nameFa: string;
  type: SpecType;
  unit: string | null;
  category: string | null;
  isRequired: boolean;
  isFilterable: boolean;
  isSearchable: boolean;
  isVariantAxis: boolean;
  sortOrder: number;
  /** AUDIT §۱۲.۴ — جایگاه در «مشخصات کلیدی» کارت/صفحه‌ی محصول؛ null = نیست.
   * در ساخت تعریف تازه اگر نیاید، سرور برای پردازنده/گرافیک/رم پیش‌فرض می‌گذارد. */
  keySpecOrder?: number | null;
  values: SpecValue[];
  usageCount: number;
}

/** شکل خلاصه‌ی تعریف در پاسخ مشخصات/واریانت محصول. */
export interface SpecDefinitionRef {
  id: string;
  key: string;
  nameFa: string;
  type: SpecType;
  unit: string | null;
  isRequired: boolean;
  isVariantAxis: boolean;
  values: SpecValue[];
}

export interface ProductSpecRow {
  definitionId: string;
  valueId: string | null;
  customValue: string;
}

export type PriceModel = "FIXED" | "SUPPLIER_PLUS_PROFIT";

export interface VariantRow {
  id?: string;
  sku: string;
  name: string;
  label?: string;
  axisValues: Record<string, string>;
  finalPrice: number;
  compareAtPrice: number | null;
  isDefault: boolean;
  isPreorder: boolean;
  isActive: boolean;
  stock: number;
  reserved?: number;
  available?: number;
  hasOrders?: boolean;
  priceModel?: PriceModel;
  supplierPrice?: number | null;
  profitType?: "AMOUNT" | "PERCENT" | null;
  profitAmountToman?: number | null;
  profitPercentBasisPoints?: number | null;
}

export interface VariantsResponse {
  axes: SpecDefinitionRef[];
  usedAxes: string[];
  rows: VariantRow[];
  canEditCost: boolean;
}

export interface InventoryRow {
  variantId: string;
  sku: string;
  variantName: string | null;
  productId: string;
  productName: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number | null;
  isLow: boolean;
  updatedAt: string;
}

export type TransactionType =
  "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT" | "RESERVATION" | "RELEASE";

export const TRANSACTION_LABELS: Record<TransactionType, string> = {
  STOCK_IN: "ورود به انبار",
  STOCK_OUT: "خروج از انبار",
  ADJUSTMENT: "اصلاح موجودی",
  RESERVATION: "رزرو",
  RELEASE: "آزادسازی رزرو",
};

export interface InventoryTransaction {
  id: string;
  sku: string;
  productName: string;
  type: TransactionType;
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  reference: string | null;
  note: string | null;
  userName: string | null;
  createdAt: string;
}

export interface PriceRow {
  id: string;
  sku: string;
  name: string | null;
  productId: string;
  productName: string;
  productSlug: string;
  finalPrice: number;
  compareAtPrice: number | null;
  priceModel: PriceModel;
}

export interface PriceChange {
  variant: string;
  sku: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
}

export interface PriceHistoryEntry {
  previousPrice: number;
  newPrice: number;
  reason: string | null;
  changedBy: string | null;
  createdAt: string;
}

export type HomepageBlockType =
  | "HERO"
  | "CATEGORY_GRID"
  | "FLAGSHIP_DUEL"
  | "PRODUCT_RAIL"
  | "CAMPAIGN"
  | "BENEFITS"
  | "BLOG_RAIL";

export const BLOCK_TYPE_LABELS: Record<HomepageBlockType, string> = {
  HERO: "هیرو",
  CATEGORY_GRID: "شبکه‌ی دسته‌ها",
  FLAGSHIP_DUEL: "دوئل پرچم‌دار",
  PRODUCT_RAIL: "ردیف محصولات",
  CAMPAIGN: "کمپین",
  BENEFITS: "مزایا",
  BLOG_RAIL: "ردیف وبلاگ",
};

export interface HomepageBlock {
  id: string;
  type: HomepageBlockType;
  sortOrder: number;
  isActive: boolean;
  title: string | null;
  subtitle: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  imageDesktop: string | null;
  imageMobile: string | null;
  imageAlt: string | null;
  config: Record<string, unknown> | null;
  startsAt: string | null;
  endsAt: string | null;
  updatedAt: string;
}

// ---- F-03 ----
export interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  notes: string | null;
  isActive: boolean;
  productsCount: number;
}

export interface SupplierProduct {
  id: string;
  supplier: string;
  supplierName: string;
  variant: string;
  sku: string;
  productName: string;
  price: number;
  isAvailable: boolean;
  lastUpdatedAt: string;
}

export interface PriceRuleRow {
  id: string;
  supplier: string | null;
  category: string | null;
  level: "supplier" | "category" | "global";
  profitType: "AMOUNT" | "PERCENT";
  profitAmountToman: number | null;
  profitPercentBasisPoints: number | null;
  isActive: boolean;
}

export interface RecalcChange {
  variant: string;
  sku: string;
  productName: string;
  supplierPrice: number;
  oldPrice: number;
  newPrice: number;
  profitSource: string;
}

export interface ImportMappingPair {
  field: string;
  header: string;
}

export interface ImportJob {
  id: string;
  originalName: string;
  headers: string[];
  columnMapping: ImportMappingPair[];
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  error: string;
  createdByName: string | null;
  createdAt: string;
  completedAt: string | null;
  fields?: { key: string; label: string }[];
  failed?: { row: number; sku: string | null; error: string }[];
  created?: number;
  updated?: number;
}

export interface ImportPreviewRow {
  row: number;
  sku: string;
  action: "create" | "update" | "error";
  errors: string[];
  name: string | null;
}

export interface Campaign {
  id: string;
  name: string;
  startAt: string;
  endAt: string;
  isActive: boolean;
  priority: number;
  rules: { discountType: "PERCENT" | "AMOUNT"; value: number } | null;
  products: { id: string; name: string; slug: string }[];
  categories: { id: string; name: string }[];
  state: "running" | "scheduled" | "ended" | "inactive";
}
