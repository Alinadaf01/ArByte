import { authorizedFetch, buildQuery, parseOrThrow } from "@/lib/api";
import type { PaginatedResponse } from "@/types/api";
import type {
  AdminBrand,
  AdminCategory,
  AdminProduct,
  AdminProductListItem,
  Campaign,
  ImportJob,
  ImportMappingPair,
  ImportPreviewRow,
  PriceRuleRow,
  RecalcChange,
  Supplier,
  SupplierProduct,
  HomepageBlock,
  InventoryRow,
  InventoryTransaction,
  PriceChange,
  PriceHistoryEntry,
  PriceRow,
  ProductFormValues,
  ProductImage,
  ProductSpecRow,
  SpecDefinition,
  SpecDefinitionRef,
  SpecValue,
  VariantRow,
  VariantsResponse,
} from "@/types/catalog";

/** F-02 — همه‌ی مسیرهای کاتالوگ پنل (docs/api/ADMIN.md). */

async function readError(res: Response, fallback: string): Promise<Error> {
  const body = await res.json().catch(() => null);
  if (body && typeof body === "object") {
    if ("detail" in body && typeof body.detail === "string")
      return new Error(body.detail);
    const first = Object.values(body)[0];
    const message = Array.isArray(first) ? first[0] : first;
    if (typeof message === "string") return new Error(message);
  }
  return new Error(fallback);
}

async function send<T>(
  path: string,
  method: string,
  body: unknown,
  fallback: string,
): Promise<T> {
  const res = await authorizedFetch(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw await readError(res, fallback);
  return res.status === 204 ? (undefined as T) : res.json();
}

async function downloadFile(path: string, filename: string): Promise<void> {
  const res = await authorizedFetch(path);
  if (!res.ok) throw await readError(res, "دریافت فایل ناموفق بود.");
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---- آپلود تصویر (WebP سمت سرور) ----
export async function uploadImage(
  file: File,
  folder: "products" | "categories" | "brands" | "homepage",
): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  const res = await authorizedFetch("/uploads/", {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw await readError(res, "آپلود تصویر ناموفق بود.");
  return (await res.json()).url;
}

// ---- دسته ----
export async function listCategories(
  params: { pageSize?: number } = {},
): Promise<PaginatedResponse<AdminCategory>> {
  const res = await authorizedFetch(
    `/categories/${buildQuery({ pageSize: 100, ...params })}`,
  );
  return parseOrThrow(res, "دریافت دسته‌بندی‌ها ناموفق بود.");
}
export const saveCategory = (id: string | null, data: Partial<AdminCategory>) =>
  send<AdminCategory>(
    id ? `/categories/${id}/` : "/categories/",
    id ? "PATCH" : "POST",
    data,
    "ذخیره‌ی دسته ناموفق بود.",
  );
export const deleteCategory = (id: string) =>
  send<void>(`/categories/${id}/`, "DELETE", undefined, "حذف دسته ناموفق بود.");

// ---- برند ----
export async function listBrands(search = ""): Promise<AdminBrand[]> {
  const res = await authorizedFetch(
    `/brands/${buildQuery({ search: search || undefined })}`,
  );
  return parseOrThrow(res, "دریافت برندها ناموفق بود.");
}
export const saveBrand = (id: string | null, data: Partial<AdminBrand>) =>
  send<AdminBrand>(
    id ? `/brands/${id}/` : "/brands/",
    id ? "PATCH" : "POST",
    data,
    "ذخیره‌ی برند ناموفق بود.",
  );
export const deleteBrand = (id: string) =>
  send<void>(`/brands/${id}/`, "DELETE", undefined, "حذف برند ناموفق بود.");

// ---- محصول ----
export interface ProductListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  brand?: string;
  status?: string;
  condition?: string;
  stock?: string;
}
export async function listProducts(
  params: ProductListParams,
): Promise<PaginatedResponse<AdminProductListItem>> {
  const res = await authorizedFetch(`/products/${buildQuery(params)}`);
  return parseOrThrow(res, "دریافت محصولات ناموفق بود.");
}
export async function getProduct(id: string): Promise<AdminProduct> {
  const res = await authorizedFetch(`/products/${id}/`);
  return parseOrThrow(res, "دریافت محصول ناموفق بود.");
}
export const saveProduct = (
  id: string | null,
  data: Partial<ProductFormValues>,
) =>
  send<AdminProduct>(
    id ? `/products/${id}/` : "/products/",
    id ? "PATCH" : "POST",
    data,
    "ذخیره‌ی محصول ناموفق بود.",
  );
export const deleteProduct = (id: string) =>
  send<void>(`/products/${id}/`, "DELETE", undefined, "حذف محصول ناموفق بود.");

export async function uploadProductImages(
  productId: string,
  items: { file: File; alt: string }[],
): Promise<ProductImage[]> {
  const form = new FormData();
  for (const item of items) {
    form.append("files", item.file);
    form.append("alts", item.alt);
  }
  const res = await authorizedFetch(`/products/${productId}/images/`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw await readError(res, "آپلود تصاویر ناموفق بود.");
  return res.json();
}
export const updateProductImage = (
  productId: string,
  imageId: number,
  data: { altText?: string; isPrimary?: boolean },
) =>
  send<ProductImage>(
    `/products/${productId}/images/${imageId}/`,
    "PATCH",
    data,
    "ذخیره‌ی تصویر ناموفق بود.",
  );
export const deleteProductImage = (productId: string, imageId: number) =>
  send<void>(
    `/products/${productId}/images/${imageId}/`,
    "DELETE",
    undefined,
    "حذف تصویر ناموفق بود.",
  );
export const reorderProductImages = (productId: string, ids: number[]) =>
  send<ProductImage[]>(
    `/products/${productId}/images/reorder/`,
    "POST",
    { ids },
    "مرتب‌سازی تصاویر ناموفق بود.",
  );

export async function getProductSpecs(
  productId: string,
): Promise<{ definitions: SpecDefinitionRef[]; specs: ProductSpecRow[] }> {
  const res = await authorizedFetch(`/products/${productId}/specs/`);
  return parseOrThrow(res, "دریافت مشخصات ناموفق بود.");
}
export const saveProductSpecs = (productId: string, specs: ProductSpecRow[]) =>
  send<{ definitions: SpecDefinitionRef[]; specs: ProductSpecRow[] }>(
    `/products/${productId}/specs/`,
    "PUT",
    { specs },
    "ذخیره‌ی مشخصات ناموفق بود.",
  );

export async function getProductVariants(
  productId: string,
): Promise<VariantsResponse> {
  const res = await authorizedFetch(`/products/${productId}/variants/`);
  return parseOrThrow(res, "دریافت واریانت‌ها ناموفق بود.");
}
export const saveProductVariants = (
  productId: string,
  axes: string[],
  rows: VariantRow[],
) =>
  send<VariantsResponse>(
    `/products/${productId}/variants/`,
    "PUT",
    { axes, rows },
    "ذخیره‌ی واریانت‌ها ناموفق بود.",
  );
export const previewVariantLabels = (
  productId: string,
  axes: string[],
  rows: Pick<VariantRow, "axisValues">[],
) =>
  send<{ labels: string[] }>(
    `/products/${productId}/variants/preview/`,
    "POST",
    { axes, rows },
    "پیش‌نمایش برچسب ناموفق بود.",
  );

// ---- مشخصات ----
export async function listSpecDefinitions(
  category = "",
): Promise<SpecDefinition[]> {
  const res = await authorizedFetch(
    `/specifications/${buildQuery({ category: category || undefined })}`,
  );
  return parseOrThrow(res, "دریافت مشخصات ناموفق بود.");
}
export const saveSpecDefinition = (
  id: string | null,
  data: Partial<SpecDefinition>,
) =>
  send<SpecDefinition>(
    id ? `/specifications/${id}/` : "/specifications/",
    id ? "PATCH" : "POST",
    data,
    "ذخیره‌ی مشخصه ناموفق بود.",
  );
export const deleteSpecDefinition = (id: string) =>
  send<void>(
    `/specifications/${id}/`,
    "DELETE",
    undefined,
    "حذف مشخصه ناموفق بود.",
  );
export const saveSpecValue = (
  definitionId: string,
  id: string | null,
  data: Partial<SpecValue>,
) =>
  send<SpecValue>(
    id
      ? `/specifications/${definitionId}/values/${id}/`
      : `/specifications/${definitionId}/values/`,
    id ? "PATCH" : "POST",
    data,
    "ذخیره‌ی مقدار ناموفق بود.",
  );
export const deleteSpecValue = (definitionId: string, id: string) =>
  send<void>(
    `/specifications/${definitionId}/values/${id}/`,
    "DELETE",
    undefined,
    "حذف مقدار ناموفق بود.",
  );

// ---- موجودی و کاردکس ----
export async function listInventory(params: {
  page?: number;
  search?: string;
  isLow?: string;
  outOfStock?: string;
}): Promise<PaginatedResponse<InventoryRow>> {
  const res = await authorizedFetch(`/inventory/${buildQuery(params)}`);
  return parseOrThrow(res, "دریافت موجودی ناموفق بود.");
}
export const setLowStockThreshold = (
  variantId: string,
  lowStockThreshold: number | null,
) =>
  send<InventoryRow>(
    `/inventory/${variantId}/`,
    "PATCH",
    { lowStockThreshold },
    "ذخیره‌ی آستانه ناموفق بود.",
  );
export interface LedgerParams {
  page?: number;
  search?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  variant?: string;
}
export async function listTransactions(
  params: LedgerParams,
): Promise<PaginatedResponse<InventoryTransaction>> {
  const res = await authorizedFetch(
    `/inventory/transactions/${buildQuery(params)}`,
  );
  return parseOrThrow(res, "دریافت کاردکس ناموفق بود.");
}
export const createTransaction = (data: {
  variant: string;
  type: string;
  quantity: number;
  note: string;
}) =>
  send<InventoryTransaction>(
    "/inventory/transactions/",
    "POST",
    data,
    "ثبت تراکنش ناموفق بود.",
  );
export const exportLedger = (params: LedgerParams, format: "xlsx" | "pdf") =>
  downloadFile(
    `/inventory/transactions/${buildQuery({ ...params, page: undefined, format })}`,
    `stock-ledger.${format}`,
  );
export const downloadStocktake = () =>
  downloadFile("/inventory/stocktake.pdf", "stocktake-sheet.pdf");

// ---- قیمت ----
export async function listPrices(params: {
  page?: number;
  search?: string;
  category?: string;
  brand?: string;
}): Promise<PaginatedResponse<PriceRow>> {
  const res = await authorizedFetch(
    `/pricing/${buildQuery({ pageSize: 50, ...params })}`,
  );
  return parseOrThrow(res, "دریافت قیمت‌ها ناموفق بود.");
}
export type BulkPriceBody =
  | {
      mode: "percent" | "amount";
      value: number;
      variantIds: string[];
      reason?: string;
    }
  | { changes: { variant: string; newPrice: number }[]; reason?: string };
export const previewPrices = (body: BulkPriceBody) =>
  send<{ count: number; changes: PriceChange[] }>(
    "/pricing/preview/",
    "POST",
    body,
    "پیش‌نمایش قیمت ناموفق بود.",
  );
export const applyPrices = (body: BulkPriceBody) =>
  send<{ count: number; changes: PriceChange[] }>(
    "/pricing/apply/",
    "POST",
    body,
    "اعمال قیمت ناموفق بود.",
  );
export async function getPriceHistory(
  variantId: string,
): Promise<PriceHistoryEntry[]> {
  const res = await authorizedFetch(`/pricing/${variantId}/history/`);
  return parseOrThrow(res, "دریافت تاریخچه‌ی قیمت ناموفق بود.");
}
export const downloadPriceList = (params: {
  search?: string;
  category?: string;
  brand?: string;
}) =>
  downloadFile(
    `/pricing/price-list.pdf${buildQuery(params)}`,
    "price-list.pdf",
  );

// ---- صفحه اصلی ----
export async function listHomepageBlocks(): Promise<HomepageBlock[]> {
  const res = await authorizedFetch("/homepage/blocks/");
  return parseOrThrow(res, "دریافت بلوک‌ها ناموفق بود.");
}
export const saveHomepageBlock = (
  id: string | null,
  data: Partial<HomepageBlock>,
) =>
  send<HomepageBlock>(
    id ? `/homepage/blocks/${id}/` : "/homepage/blocks/",
    id ? "PATCH" : "POST",
    data,
    "ذخیره‌ی بلوک ناموفق بود.",
  );
export const deleteHomepageBlock = (id: string) =>
  send<void>(
    `/homepage/blocks/${id}/`,
    "DELETE",
    undefined,
    "حذف بلوک ناموفق بود.",
  );
export const reorderHomepageBlocks = (ids: number[]) =>
  send<HomepageBlock[]>(
    "/homepage/blocks/reorder/",
    "POST",
    { ids },
    "مرتب‌سازی بلوک‌ها ناموفق بود.",
  );

// ---- F-03: تأمین‌کننده، قیمت همکار، قانون سود ----
export async function listSuppliers(): Promise<Supplier[]> {
  const res = await authorizedFetch("/suppliers/");
  return parseOrThrow(res, "دریافت تأمین‌کنندگان ناموفق بود.");
}
export const saveSupplier = (id: string | null, data: Partial<Supplier>) =>
  send<Supplier>(
    id ? `/suppliers/${id}/` : "/suppliers/",
    id ? "PATCH" : "POST",
    data,
    "ذخیره‌ی تأمین‌کننده ناموفق بود.",
  );
export const deleteSupplier = (id: string) =>
  send<void>(`/suppliers/${id}/`, "DELETE", undefined, "حذف ناموفق بود.");
export async function listSupplierProducts(params: {
  supplier?: string;
  page?: number;
}): Promise<PaginatedResponse<SupplierProduct>> {
  const res = await authorizedFetch(
    `/supplier-products/${buildQuery({ pageSize: 50, ...params })}`,
  );
  return parseOrThrow(res, "دریافت قیمت‌های همکار ناموفق بود.");
}
export const saveSupplierProduct = (
  id: string | null,
  data: Partial<SupplierProduct>,
) =>
  send<SupplierProduct>(
    id ? `/supplier-products/${id}/` : "/supplier-products/",
    id ? "PATCH" : "POST",
    data,
    "ذخیره‌ی قیمت همکار ناموفق بود.",
  );
export const deleteSupplierProduct = (id: string) =>
  send<void>(
    `/supplier-products/${id}/`,
    "DELETE",
    undefined,
    "حذف ناموفق بود.",
  );
export async function listPriceRules(): Promise<PriceRuleRow[]> {
  const res = await authorizedFetch("/price-rules/");
  return parseOrThrow(res, "دریافت قوانین سود ناموفق بود.");
}
export const savePriceRule = (id: string | null, data: Partial<PriceRuleRow>) =>
  send<PriceRuleRow>(
    id ? `/price-rules/${id}/` : "/price-rules/",
    id ? "PATCH" : "POST",
    data,
    "ذخیره‌ی قانون ناموفق بود.",
  );
export const deletePriceRule = (id: string) =>
  send<void>(`/price-rules/${id}/`, "DELETE", undefined, "حذف ناموفق بود.");
export const recalculatePrices = (apply: boolean) =>
  send<{
    applied: boolean;
    count: number;
    changes: RecalcChange[];
    skipped: { variant: string; sku: string; reason: string }[];
  }>("/pricing/recalculate/", "POST", { apply }, "بازمحاسبه ناموفق بود.");

// ---- F-03: ورود اکسل ----
export async function listImportJobs(): Promise<PaginatedResponse<ImportJob>> {
  const res = await authorizedFetch("/imports/");
  return parseOrThrow(res, "دریافت تاریخچه‌ی ورود ناموفق بود.");
}
export async function uploadImportFile(file: File): Promise<ImportJob> {
  const form = new FormData();
  form.append("file", file);
  const res = await authorizedFetch("/imports/", {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw await readError(res, "آپلود فایل ناموفق بود.");
  return res.json();
}
export async function getImportJob(id: string): Promise<ImportJob> {
  const res = await authorizedFetch(`/imports/${id}/`);
  return parseOrThrow(res, "دریافت وضعیت ورود ناموفق بود.");
}
export const previewImport = (id: string, mapping: ImportMappingPair[]) =>
  send<{
    summary: { create: number; update: number; error: number };
    rows: ImportPreviewRow[];
  }>(`/imports/${id}/preview/`, "POST", { mapping }, "پیش‌نمایش ناموفق بود.");
export const runImport = (id: string) =>
  send<ImportJob>(`/imports/${id}/run/`, "POST", {}, "اجرای ورود ناموفق بود.");
export const downloadImportTemplate = () =>
  downloadFile("/imports/template.xlsx", "arbyte-products-template.xlsx");
export const downloadImportErrors = (id: string) =>
  downloadFile(`/imports/${id}/errors.xlsx`, `import-${id}-errors.xlsx`);

// ---- F-03: کمپین ----
export async function listCampaigns(): Promise<PaginatedResponse<Campaign>> {
  const res = await authorizedFetch("/campaigns/?pageSize=100");
  return parseOrThrow(res, "دریافت کمپین‌ها ناموفق بود.");
}
export type CampaignBody = Partial<
  Pick<Campaign, "name" | "startAt" | "endAt" | "isActive" | "priority">
> & {
  discountType?: "PERCENT" | "AMOUNT";
  value?: number;
  productIds?: number[];
  categoryIds?: number[];
};
export const saveCampaign = (id: string | null, data: CampaignBody) =>
  send<Campaign>(
    id ? `/campaigns/${id}/` : "/campaigns/",
    id ? "PATCH" : "POST",
    data,
    "ذخیره‌ی کمپین ناموفق بود.",
  );
export const deleteCampaign = (id: string) =>
  send<void>(`/campaigns/${id}/`, "DELETE", undefined, "حذف کمپین ناموفق بود.");
export async function previewCampaign(
  id: string,
): Promise<{
  count: number;
  rows: {
    variant: string;
    sku: string;
    productName: string;
    price: number;
    campaignPrice: number;
  }[];
}> {
  const res = await authorizedFetch(`/campaigns/${id}/preview/`);
  return parseOrThrow(res, "پیش‌نمایش کمپین ناموفق بود.");
}
