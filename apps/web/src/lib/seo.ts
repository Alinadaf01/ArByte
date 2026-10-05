/**
 * AUDIT-1 B — Next.js `openGraph` هر صفحه را کامل جایگزین `openGraph`
 * لایه‌ی ریشه می‌کند (ادغام عمیق نیست)؛ بدون این پایه، صفحه‌ها
 * `og:site_name` و `og:locale` نداشتند. هر صفحه این را اول spread کند.
 */
export const SITE_OPEN_GRAPH = {
  siteName: "آربایت",
  locale: "fa_IR",
  type: "website",
} as const;
