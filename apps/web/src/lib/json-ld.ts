/** JSON-LD امن برای `<script type="application/ld+json">` — `<` فرار داده می‌شود تا متن ادمین نتواند `</script>` بسازد. */
export function jsonLd(data: unknown): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}

// AUDIT-1 §12.8 — ساخت آدرس مطلق فقط در lib/urls.
export { absoluteUrl } from "./urls";
