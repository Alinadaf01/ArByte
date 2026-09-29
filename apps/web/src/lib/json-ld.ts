/** JSON-LD امن برای `<script type="application/ld+json">` — `<` فرار داده می‌شود تا متن ادمین نتواند `</script>` بسازد. */
export function jsonLd(data: unknown): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}

export function absoluteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}
