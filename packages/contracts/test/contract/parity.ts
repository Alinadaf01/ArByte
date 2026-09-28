/**
 * D-03 §4 — «تست برابری با Nest»: همان درخواست‌ها را به Nest و Django
 * می‌زند، id‌ها و requestId را کنار می‌گذارد و بقیه را مقایسه می‌کند. صفر
 * اختلاف، یا هر اختلاف با دلیل مستند در گزارش.
 *
 * اجرا: هر دو سرور بالا و روی داده‌ی برابر seed شده باشند (Nest: `pnpm
 * db:seed`؛ Django: `pnpm --filter @arbyte/api export-catalog` سپس
 * `manage.py seed_arbyte`).
 *
 *   NEST_API_URL=http://localhost:4000/api/v1 DJANGO_API_URL=http://localhost:8000/api/v1 \
 *     pnpm contract:parity
 */
import { fetchJson } from "./client";

const nestUrl = process.env.NEST_API_URL ?? "http://localhost:4000/api/v1";
const djangoUrl = process.env.DJANGO_API_URL ?? "http://localhost:8000/api/v1";

// Field names that are legitimately allowed to differ (Nest: Prisma cuid
// strings; Django: stringified integer PKs) — stripped before comparison.
const ID_LIKE_KEY = /^(id|requestId|.*Id)$/;

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalize);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // axisValues is a Record<specDefId, value> — the *keys* are id-like too
    // (not just a field literally named "...Id"), so compare its value set
    // instead of its key set.
    if (
      "axisValues" in obj &&
      obj.axisValues &&
      typeof obj.axisValues === "object"
    ) {
      const values = Object.values(
        obj.axisValues as Record<string, string>,
      ).sort();
      const rest: Record<string, unknown> = {};
      for (const [key, v] of Object.entries(obj)) {
        if (key === "axisValues") continue;
        if (ID_LIKE_KEY.test(key)) continue;
        rest[key] = normalize(v);
      }
      rest.axisValuesSorted = values;
      return rest;
    }
    const result: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(obj)) {
      if (ID_LIKE_KEY.test(key)) continue;
      result[key] = normalize(v);
    }
    return result;
  }
  return value;
}

interface Endpoint {
  name: string;
  path: (ctx: { categorySlug: string; productSlug: string }) => string;
}

const ENDPOINTS: Endpoint[] = [
  { name: "categories tree", path: () => "/catalog/categories" },
  { name: "top-level categories", path: () => "/catalog/categories/top-level" },
  {
    name: "category detail",
    path: ({ categorySlug }) => `/catalog/categories/${categorySlug}`,
  },
  { name: "product list (default)", path: () => "/catalog/products" },
  {
    name: "product list (perPage=60)",
    path: () => "/catalog/products?perPage=60",
  },
  {
    name: "product list (sort=price_asc)",
    path: () => "/catalog/products?sort=price_asc&perPage=60",
  },
  {
    name: "product list (category filter)",
    path: ({ categorySlug }) => `/catalog/products?category=${categorySlug}`,
  },
  {
    name: "product detail",
    path: ({ productSlug }) => `/catalog/products/${productSlug}`,
  },
  {
    name: "filters (category)",
    path: ({ categorySlug }) => `/catalog/filters?category=${categorySlug}`,
  },
  { name: "filters (no category)", path: () => "/catalog/filters" },
  { name: "search", path: () => "/catalog/search?q=a" },
  { name: "homepage", path: () => "/content/homepage" },
];

// Canonical (sorted-key) JSON — used to compare arrays as multisets below,
// so two objects with the same fields in a different key order don't read
// as "different".
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

// Fields whose *element order* is not part of the Zod contract and is not
// otherwise business-meaningful (unlike, say, `data` in a sorted product
// list, or `variants`/`images`, which really are ordered) — both Nest and
// Django build these from an unordered accumulator (Map/Set on the Nest
// side, dict/queryset on the Django side) seeded by each database's own,
// independently-seeded physical row order. Verified live (contract:parity
// run, D-03): real, reproducible diffs that are pure reordering, zero
// content difference — see docs/reports/D-03.md for the two concrete cases
// (keySpecs tie between same-priority specs; filters.brands/conditions).
const ORDER_INSENSITIVE_PATH = /(\.keySpecs|\.brands|\.conditions)$/;

function diff(a: unknown, b: unknown, path = "$"): string[] {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length)
      return [`${path}: length ${a.length} != ${b.length}`];
    if (ORDER_INSENSITIVE_PATH.test(path)) {
      const sortedA = [...a].sort((x, y) =>
        canonical(x).localeCompare(canonical(y)),
      );
      const sortedB = [...b].sort((x, y) =>
        canonical(x).localeCompare(canonical(y)),
      );
      return sortedA.flatMap((item, i) =>
        diff(item, sortedB[i], `${path}[${i}](unordered)`),
      );
    }
    return a.flatMap((item, i) => diff(item, b[i], `${path}[${i}]`));
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const keys = new Set([
      ...Object.keys(a as object),
      ...Object.keys(b as object),
    ]);
    const diffs: string[] = [];
    for (const key of keys) {
      diffs.push(
        ...diff(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
          `${path}.${key}`,
        ),
      );
    }
    return diffs;
  }
  return [`${path}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`];
}

async function main() {
  const nestCategories = await fetchJson(
    nestUrl,
    "/catalog/categories/top-level",
  );
  const categorySlug = (nestCategories.body as { data: { slug: string }[] })
    .data[0]!.slug;
  const nestProducts = await fetchJson(nestUrl, "/catalog/products?perPage=1");
  const productSlug = (nestProducts.body as { data: { slug: string }[] })
    .data[0]!.slug;

  let totalDiffs = 0;
  for (const endpoint of ENDPOINTS) {
    const path = endpoint.path({ categorySlug, productSlug });
    const [nest, django] = await Promise.all([
      fetchJson(nestUrl, path),
      fetchJson(djangoUrl, path),
    ]);

    if (nest.status !== django.status) {
      console.error(
        `✗ ${endpoint.name} (${path}): status ${nest.status} (Nest) != ${django.status} (Django)`,
      );
      totalDiffs++;
      continue;
    }

    const diffs = diff(normalize(nest.body), normalize(django.body));
    if (diffs.length === 0) {
      console.log(`✓ ${endpoint.name} (${path})`);
    } else {
      console.error(`✗ ${endpoint.name} (${path}): ${diffs.length} diff(s)`);
      for (const d of diffs.slice(0, 10)) console.error(`    ${d}`);
      totalDiffs += diffs.length;
    }
  }

  if (totalDiffs > 0) {
    console.error(`\ncontract:parity — ${totalDiffs} diff(s) found.`);
    process.exit(1);
  }
  console.log("\ncontract:parity — zero diffs.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
