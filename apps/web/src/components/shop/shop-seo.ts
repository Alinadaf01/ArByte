/**
 * T-213 §۹ — قاعده‌ی سئو مشترک `/products` و `/category/[slug]`:
 * بدون فیلتر/مرتب‌سازی → index، canonical خودش؛ با هر فیلتر یا sort →
 * noindex,follow؛ page≥۲ بدون فیلتر → index، canonical به صفحه‌ی ۱.
 */
export function computeShopRobotsAndCanonical(
  params: Record<string, string | string[] | undefined>,
  canonicalPath: string,
): { index: boolean; canonicalPath: string } {
  const filterKeys = Object.keys(params).filter((key) => {
    if (key === "page") return false;
    const value = params[key];
    const v = Array.isArray(value) ? value[0] : value;
    return v !== undefined && v !== "";
  });

  if (filterKeys.length > 0) {
    return { index: false, canonicalPath };
  }

  return { index: true, canonicalPath };
}
