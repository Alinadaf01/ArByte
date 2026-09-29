#!/usr/bin/env node
/**
 * G-02 — ممیزی خودکار سئو روی همه‌ی مسیرها (بدون وابستگی).
 *
 *   node scripts/seo-audit.mjs [BASE_URL]      # پیش‌فرض http://localhost:3000
 *
 * مسیرها: صفحه‌های ثابت + نمونه‌ای از sitemap.xml (محصول، دسته، نوشته) +
 * صفحه‌های خصوصی. بررسی: وضعیت، title/description یکتا، canonical مطلق،
 * noindex صفحه‌های خصوصی، OG/Twitter، JSON-LD معتبر و نوع‌های لازم،
 * robots.txt و sitemap.xml. هر خطا → کد خروج ۱.
 */

const BASE = (
  process.argv[2] ??
  process.env.SEO_AUDIT_BASE ??
  "http://localhost:3000"
).replace(/\/$/, "");
const SAMPLE_PER_KIND = Number(process.env.SEO_AUDIT_SAMPLE ?? 5);

const PUBLIC_PAGES = [
  "/",
  "/products",
  "/categories",
  "/blog",
  "/about",
  "/support",
  "/legal",
];
const PRIVATE_PAGES = [
  "/cart",
  "/checkout",
  "/account",
  "/login",
  "/wishlist",
  "/compare",
  "/track-order",
  "/search?q=test",
];

const errors = [];
const warnings = [];
const fail = (path, msg) => errors.push(`${path}: ${msg}`);

function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i"));
  return m ? m[1] : null;
}

function metaContent(html, key) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    if (attr(tag, "name") === key || attr(tag, "property") === key)
      return attr(tag, "content");
  }
  return null;
}

function decode(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parsePage(html) {
  const title = decode(
    html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "",
  );
  const canonicalTag = (html.match(/<link\b[^>]*rel="canonical"[^>]*>/i) ??
    [])[0];
  const jsonLd = [
    ...html.matchAll(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ].map((m) => m[1]);
  return {
    title,
    description: decode(metaContent(html, "description") ?? ""),
    robots: metaContent(html, "robots") ?? "",
    canonical: canonicalTag ? attr(canonicalTag, "href") : null,
    ogTitle: metaContent(html, "og:title"),
    ogDescription: metaContent(html, "og:description"),
    twitterCard: metaContent(html, "twitter:card"),
    jsonLd,
  };
}

function ldTypes(blocks, path) {
  const types = new Set();
  for (const raw of blocks) {
    try {
      const data = JSON.parse(raw);
      for (const item of Array.isArray(data) ? data : [data])
        if (item["@type"]) types.add(item["@type"]);
    } catch {
      fail(path, "JSON-LD نامعتبر");
    }
  }
  return types;
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, {
    redirect: "manual",
    headers: { "user-agent": "ArByte-SEO-Audit/1.0 (bot)" },
  });
  return { status: res.status, text: await res.text() };
}

async function sitemapSample() {
  const { status, text } = await get("/sitemap.xml");
  if (status !== 200) {
    fail("/sitemap.xml", `وضعیت ${status}`);
    return [];
  }
  const urls = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (m) => new URL(m[1]).pathname,
  );
  if (urls.length === 0) fail("/sitemap.xml", "هیچ URLی ندارد");
  if (!/<lastmod>/.test(text)) warnings.push("/sitemap.xml: lastmod ندارد");
  const pick = (prefix) =>
    urls.filter((u) => u.startsWith(prefix)).slice(0, SAMPLE_PER_KIND);
  return [...pick("/products/"), ...pick("/category/"), ...pick("/blog/")];
}

async function main() {
  const robots = await get("/robots.txt");
  if (robots.status !== 200 || !/Sitemap:/i.test(robots.text))
    fail("/robots.txt", "Sitemap ندارد");
  for (const p of ["/cart", "/checkout", "/account", "/api/"])
    if (!robots.text.includes(`Disallow: ${p}`))
      fail("/robots.txt", `Disallow ${p} ندارد`);

  const indexable = [...PUBLIC_PAGES, ...(await sitemapSample())];
  const seenTitles = new Map();
  const seenDescriptions = new Map();

  for (const path of indexable) {
    const { status, text } = await get(path);
    if (status !== 200) {
      fail(path, `وضعیت ${status}`);
      continue;
    }
    const page = parsePage(text);
    if (!page.title) fail(path, "title ندارد");
    if (!page.description) fail(path, "description ندارد");
    if (/noindex/i.test(page.robots)) fail(path, "صفحه‌ی عمومی noindex است");
    if (!page.canonical) fail(path, "canonical ندارد");
    else if (!/^https?:\/\//.test(page.canonical))
      fail(path, `canonical مطلق نیست (${page.canonical})`);
    if (!page.ogTitle || !page.ogDescription)
      fail(path, "og:title/og:description ندارد");
    if (!page.twitterCard) fail(path, "twitter:card ندارد");
    const types = ldTypes(page.jsonLd, path);
    if (!types.has("Organization")) fail(path, "JSON-LD Organization ندارد");
    if (path === "/" && !types.has("WebSite"))
      fail(path, "JSON-LD WebSite ندارد");
    if (
      path.startsWith("/products/") &&
      !(types.has("Product") && types.has("BreadcrumbList"))
    )
      fail(path, "Product/BreadcrumbList ندارد");
    if (
      path.startsWith("/blog/") &&
      !(types.has("Article") && types.has("BreadcrumbList"))
    )
      fail(path, "Article/BreadcrumbList ندارد");
    for (const [map, value, label] of [
      [seenTitles, page.title, "title"],
      [seenDescriptions, page.description, "description"],
    ]) {
      if (!value) continue;
      if (map.has(value)) fail(path, `${label} تکراری با ${map.get(value)}`);
      else map.set(value, path);
    }
  }

  for (const path of PRIVATE_PAGES) {
    const { status, text } = await get(path);
    if (status >= 500) fail(path, `وضعیت ${status}`);
    if (status >= 300 && status < 400) continue; // ریدایرکت به ورود
    if (!/noindex/i.test(parsePage(text).robots))
      fail(path, "صفحه‌ی خصوصی noindex نیست");
  }

  const nf = await get("/__seo_audit_missing__");
  if (nf.status !== 404)
    fail("/__seo_audit_missing__", `باید ۴۰۴ باشد، ${nf.status} شد`);

  console.log(
    `SEO audit — ${BASE}: ${indexable.length} صفحه‌ی عمومی، ${PRIVATE_PAGES.length} صفحه‌ی خصوصی`,
  );
  for (const w of warnings) console.log(`  ⚠ ${w}`);
  if (errors.length) {
    for (const e of errors) console.log(`  ✗ ${e}`);
    console.log(`${errors.length} خطا`);
    process.exit(1);
  }
  console.log("  ✓ همه‌ی بررسی‌ها سبز");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
