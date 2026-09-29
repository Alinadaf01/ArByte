import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  BLOG_CATEGORIES,
  blogPage,
  toPersianDigits,
  type BlogCategory,
} from "@arbyte/contracts";
import { StorefrontShell } from "@/components/shell/StorefrontShell";
import { PostCard, PostMeta } from "@/components/blog/PostCard";
import { getBlogPosts } from "@/lib/content";

export const revalidate = 60;

interface BlogPageProps {
  searchParams: Promise<{ category?: string; q?: string; page?: string }>;
}

export async function generateMetadata({
  searchParams,
}: BlogPageProps): Promise<Metadata> {
  const sp = await searchParams;
  const filtered = Boolean(sp.category || sp.q || (sp.page && sp.page !== "1"));
  return {
    title: `${blogPage.title} | آربایت`,
    description: blogPage.metaDescription,
    alternates: { canonical: "/blog" },
    // فهرست فیلترشده/صفحه‌بندی‌شده ایندکس نشود؛ فقط /blog اصلی.
    robots: filtered ? { index: false, follow: true } : undefined,
    openGraph: {
      title: blogPage.title,
      description: blogPage.metaDescription,
      url: "/blog",
      type: "website",
    },
  };
}

function hrefWith(params: { category?: string; q?: string; page?: number }) {
  const qs = new URLSearchParams();
  if (params.category) qs.set("category", params.category);
  if (params.q) qs.set("q", params.q);
  if (params.page && params.page > 1) qs.set("page", String(params.page));
  return qs.size ? `/blog?${qs}` : "/blog";
}

/** G-01 — Blog.dc.html روی API. فرم خبرنامه‌ی طراحی عمداً پنهان است. */
export default async function BlogPage({ searchParams }: BlogPageProps) {
  const sp = await searchParams;
  const category = (BLOG_CATEGORIES as readonly string[]).includes(
    sp.category ?? "",
  )
    ? (sp.category as BlogCategory)
    : undefined;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, Number(sp.page) || 1);
  const { items, pagination } = await getBlogPosts({
    category,
    q: q || undefined,
    page,
    perPage: 12,
  });
  const showFeatured = !category && !q && page === 1 && items.length > 0;
  const featured = showFeatured ? items[0]! : null;
  const grid = showFeatured ? items.slice(1) : items;
  const filtered = Boolean(category || q);
  const totalPages = pagination?.totalPages ?? 1;

  return (
    <StorefrontShell headerActive="blog">
      <div dir="rtl" className="bg-paper text-primary">
        <section className="border-border border-b bg-surface px-[5vw] pt-[clamp(26px,4vh,42px)] pb-[clamp(20px,3vh,30px)]">
          <div className="mx-auto max-w-[1240px]">
            <nav
              aria-label="مسیر"
              className="text-secondary mb-3.5 flex items-center gap-2 text-caption"
            >
              <Link href="/" className="hover:text-primary">
                {blogPage.breadcrumb.home}
              </Link>
              <span aria-hidden="true">/</span>
              <span className="text-primary font-emphasis">
                {blogPage.breadcrumb.current}
              </span>
            </nav>
            <h1 className="font-heading m-0 text-[clamp(28px,3.4vw,44px)] leading-[1.35] tracking-tight">
              {blogPage.title}
            </h1>
            <p className="text-secondary mt-2 mb-0 max-w-[56ch] text-body leading-8">
              {blogPage.subtitle}
            </p>
          </div>
        </section>

        <div className="mx-auto flex max-w-[1240px] flex-col gap-[clamp(18px,2.5vh,26px)] px-[5vw] pt-[clamp(20px,3vh,32px)] pb-[clamp(48px,7vh,80px)]">
          {featured ? (
            <Link
              href={`/blog/${featured.slug}`}
              className="bg-surface-dark text-on-dark hover:text-on-dark grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] overflow-hidden rounded-card-lg transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-popover"
            >
              <div className="relative min-h-[clamp(220px,32vh,300px)] bg-gradient-to-br from-secondary-2 to-surface-dark">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-[radial-gradient(56%_48%_at_50%_50%,rgba(108,77,255,.4),rgba(23,21,31,0)_70%)]"
                />
                {featured.cover?.url ? (
                  <Image
                    src={featured.cover.url}
                    alt={featured.cover.alt}
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 620px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="flex flex-col justify-center gap-3.5 p-[clamp(24px,3.5vw,44px)]">
                <span className="text-caption font-emphasis self-start rounded-pill border border-white/20 bg-white/10 px-3 py-1.5">
                  {blogPage.featuredBadge}
                </span>
                <h2 className="font-heading m-0 text-[clamp(22px,2.8vw,33px)] leading-normal tracking-tight text-pretty">
                  {featured.title}
                </h2>
                {featured.excerpt ? (
                  <p className="text-on-dark-secondary m-0 max-w-[46ch] text-body leading-8">
                    {featured.excerpt}
                  </p>
                ) : null}
                <PostMeta
                  post={featured}
                  className="text-on-dark-secondary mt-1"
                />
                <span className="text-brand-on-dark-alt font-emphasis mt-1 text-body">
                  {blogPage.readMore} ←
                </span>
              </div>
            </Link>
          ) : null}

          <div className="border-border flex flex-wrap items-center justify-between gap-3 rounded-panel border bg-surface px-4 py-3">
            <nav aria-label="دسته‌های بلاگ" className="flex flex-wrap gap-1.5">
              {[undefined, ...BLOG_CATEGORIES].map((cat) => {
                const on = cat === category;
                return (
                  <Link
                    key={cat ?? "all"}
                    href={hrefWith({ category: cat, q })}
                    aria-current={on ? "page" : undefined}
                    className={`text-body font-emphasis flex min-h-11 items-center rounded-tile border px-4 transition-colors ${on ? "bg-surface-dark border-surface-dark text-on-dark" : "border-border-input text-primary hover:border-brand-tint-2 bg-surface"}`}
                  >
                    {cat ?? blogPage.allCategories}
                  </Link>
                );
              })}
            </nav>
            <form
              action="/blog"
              role="search"
              className="border-border-input flex min-h-11 min-w-[210px] flex-[0_1_260px] items-center gap-2 rounded-tile border bg-surface px-3.5"
            >
              {category ? (
                <input type="hidden" name="category" value={category} />
              ) : null}
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder={blogPage.searchPlaceholder}
                aria-label={blogPage.searchPlaceholder}
                className="text-input min-w-0 flex-1 border-0 bg-transparent outline-none"
              />
            </form>
          </div>

          {items.length === 0 ? (
            <div className="border-border rounded-card border bg-surface px-6 py-[clamp(40px,7vh,72px)] text-center">
              <p className="font-heading m-0 mb-2 text-[17px]">
                {filtered ? blogPage.emptyTitle : blogPage.emptyNoPostsTitle}
              </p>
              <p className="text-secondary m-0 mb-4 text-body leading-8">
                {filtered ? blogPage.emptyBody : blogPage.emptyNoPostsBody}
              </p>
              {filtered ? (
                <Link
                  href="/blog"
                  className="bg-surface-dark text-on-dark hover:bg-brand hover:text-on-dark font-emphasis inline-flex min-h-11.5 items-center rounded-pill px-6 text-body"
                >
                  {blogPage.resetFilters}
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-[clamp(14px,2vw,20px)]">
              {grid.map((post, i) => (
                <PostCard key={post.slug} post={post} index={i} />
              ))}
            </div>
          )}

          {totalPages > 1 ? (
            <nav
              aria-label="صفحه‌بندی"
              className="flex items-center justify-center gap-3 text-body"
            >
              {page > 1 ? (
                <Link
                  href={hrefWith({ category, q, page: page - 1 })}
                  rel="prev"
                  className="border-border-input rounded-pill border bg-surface px-4 py-2"
                >
                  {blogPage.prevPage}
                </Link>
              ) : null}
              <span className="text-secondary">
                {blogPage.pageOf(
                  toPersianDigits(page),
                  toPersianDigits(totalPages),
                )}
              </span>
              {page < totalPages ? (
                <Link
                  href={hrefWith({ category, q, page: page + 1 })}
                  rel="next"
                  className="border-border-input rounded-pill border bg-surface px-4 py-2"
                >
                  {blogPage.nextPage}
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>
      </div>
    </StorefrontShell>
  );
}
