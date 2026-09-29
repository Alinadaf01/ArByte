import type { Metadata } from "next";
import Link from "next/link";
import {
  formatNumberFa,
  normalizeSearchText,
  searchPage,
} from "@arbyte/contracts";
import { StorefrontShell } from "@/components/shell/StorefrontShell";
import { SearchForm } from "@/components/search/SearchForm";
import { SearchResultCard } from "@/components/search/SearchResultCard";
import { searchProducts } from "@/lib/catalog";
import { getBlogPosts } from "@/lib/content";
import { PostCard } from "@/components/blog/PostCard";

type SearchKind = "all" | "products" | "posts" | "support";
const KIND_VALUES: readonly SearchKind[] = [
  "all",
  "products",
  "posts",
  "support",
];

interface SearchPageProps {
  searchParams: Promise<{ q?: string; kind?: string }>;
}

/** T-215 §۱ — `noindex, follow` روی همه‌ی `/search`. */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

function parseKind(raw: string | undefined): SearchKind {
  return KIND_VALUES.includes(raw as SearchKind) ? (raw as SearchKind) : "all";
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q: rawQ, kind: rawKind } = await searchParams;
  const q = (rawQ ?? "").trim();
  const kind = parseKind(rawKind);
  const isIdle = q === "";

  const [{ items: products }, { items: posts }] = isIdle
    ? [{ items: [] }, { items: [] }]
    : await Promise.all([
        searchProducts(q, 24),
        getBlogPosts({ q, perPage: 6 }),
      ]);

  const needle = normalizeSearchText(q);
  const helpMatches = isIdle
    ? []
    : searchPage.helpIndex.filter((item) =>
        normalizeSearchText(`${item.title} ${item.description}`).includes(
          needle,
        ),
      );

  const hasProducts =
    products.length > 0 && (kind === "all" || kind === "products");
  const hasHelp =
    helpMatches.length > 0 && (kind === "all" || kind === "support");
  const hasPosts = posts.length > 0 && (kind === "all" || kind === "posts");
  const totalCount = products.length + posts.length + helpMatches.length;
  const isEmpty = !isIdle && totalCount === 0;

  return (
    <StorefrontShell headerActive="" navActive="search">
      <section className="border-border border-b bg-surface px-[5vw] py-8 md:py-11">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4">
          <SearchForm
            q={q}
            kind={kind}
            resultCount={totalCount}
            isIdle={isIdle}
          />
        </div>
      </section>

      <div className="mx-auto flex max-w-[1240px] flex-col gap-7 px-[5vw] py-8 md:py-11">
        {isIdle ? (
          <div className="flex flex-col gap-5">
            <div className="border-border bg-surface flex flex-col gap-3.5 rounded-card border p-6">
              <h2 className="text-body text-primary font-emphasis">
                {searchPage.hotSearchesTitle}
              </h2>
              <div className="flex flex-wrap gap-2">
                {searchPage.hotSearches.map((term) => (
                  <Link
                    key={term}
                    href={`/search?q=${encodeURIComponent(term)}`}
                    className="border-border-input bg-surface text-secondary-2 hover:border-brand-tint-2 hover:text-brand-active min-h-11 rounded-tile-sm border px-4 text-caption font-emphasis transition-colors duration-200"
                  >
                    {term}
                  </Link>
                ))}
              </div>
            </div>
            <div className="bg-surface-dark grid grid-cols-1 items-center gap-5 rounded-card p-6 sm:grid-cols-2">
              <div>
                <h2 className="text-subhead text-on-dark font-heading tracking-tight">
                  {searchPage.suggestion.title}
                </h2>
                <p className="text-on-dark-secondary text-body mt-2 max-w-[40ch]">
                  {searchPage.suggestion.subtitle}
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <Link
                  href="/categories"
                  className="bg-surface text-primary hover:bg-brand-tint-1 flex min-h-12 items-center rounded-pill px-5.5 text-caption font-emphasis transition-colors duration-200"
                >
                  {searchPage.suggestion.categoriesCta}
                </Link>
                <Link
                  href="/support"
                  className="text-on-dark hover:border-on-dark flex min-h-12 items-center rounded-pill border border-white/22 px-5 text-caption font-emphasis transition-colors duration-200"
                >
                  {searchPage.suggestion.supportCta}
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {isEmpty ? (
          <div className="border-border bg-surface flex flex-col items-center gap-3 rounded-card border px-6 py-14 text-center">
            <p className="text-subhead text-primary font-heading">
              {searchPage.emptyState.title(q)}
            </p>
            <p className="text-body text-secondary max-w-[46ch]">
              {searchPage.emptyState.body}
            </p>
            <div className="mt-1.5 flex flex-wrap justify-center gap-2">
              {searchPage.hotSearches.slice(0, 4).map((term) => (
                <Link
                  key={term}
                  href={`/search?q=${encodeURIComponent(term)}`}
                  className="border-border-input bg-surface text-secondary-2 hover:border-brand-tint-2 hover:text-brand-active min-h-11 rounded-tile-sm border px-4 text-caption font-emphasis transition-colors duration-200"
                >
                  {term}
                </Link>
              ))}
            </div>
            <Link
              href="/support"
              className="text-caption text-primary mt-1 font-emphasis"
            >
              {searchPage.emptyState.supportCta}
            </Link>
          </div>
        ) : null}

        {hasProducts ? (
          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-subhead text-primary font-heading tracking-tight">
                {searchPage.productsHeading}
                <span className="text-caption text-secondary ms-2 font-medium">
                  {searchPage.resultCount(formatNumberFa(products.length))}
                </span>
              </h2>
              <Link
                href="/products"
                className="text-caption text-primary font-emphasis"
              >
                {searchPage.productsViewAllCta}
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => (
                <SearchResultCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ) : null}

        {hasPosts ? (
          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-subhead text-primary font-heading tracking-tight">
                {searchPage.postsHeading}
                <span className="text-caption text-secondary ms-2 font-medium">
                  {searchPage.resultCount(formatNumberFa(posts.length))}
                </span>
              </h2>
              <Link
                href={`/blog?q=${encodeURIComponent(q)}`}
                className="text-caption text-primary font-emphasis"
              >
                {searchPage.postsViewAllCta}
              </Link>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-4">
              {posts.map((post, i) => (
                <PostCard
                  key={post.slug}
                  post={post}
                  index={i}
                  headingLevel="h3"
                />
              ))}
            </div>
          </section>
        ) : null}

        {hasHelp ? (
          <section className="flex flex-col gap-4">
            <h2 className="text-subhead text-primary font-heading tracking-tight">
              {searchPage.helpHeading}
              <span className="text-caption text-secondary ms-2 font-medium">
                {searchPage.resultCount(formatNumberFa(helpMatches.length))}
              </span>
            </h2>
            <div className="border-border bg-surface overflow-hidden rounded-card border">
              {helpMatches.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="border-border-divider hover:bg-surface-muted flex flex-wrap items-center justify-between gap-3 border-b p-4.5 transition-colors duration-200 last:border-b-0"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-body text-primary font-emphasis">
                      {item.title}
                    </span>
                    <span className="text-caption text-secondary">
                      {item.description}
                    </span>
                  </div>
                  <span className="bg-brand-tint-1 text-brand-active rounded-pill px-3 py-1.5 text-micro font-emphasis whitespace-nowrap">
                    {item.tag}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </StorefrontShell>
  );
}
