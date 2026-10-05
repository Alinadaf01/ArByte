import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPage, blogPostPage, toPersianDigits } from "@arbyte/contracts";
import { StorefrontShell } from "@/components/shell/StorefrontShell";
import { PostCard } from "@/components/blog/PostCard";
import { ReadingProgress } from "@/components/blog/ReadingProgress";
import { CopyLinkButton } from "@/components/blog/CopyLinkButton";
import { getBlogPost } from "@/lib/content";
import { formatJalaliLong } from "@/lib/jalali";
import { absoluteUrl, jsonLd } from "@/lib/json-ld";
import { SITE_OPEN_GRAPH } from "@/lib/seo";

export const revalidate = 60;

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const post = await getBlogPost((await params).slug);
  if (!post)
    return { title: "نوشته پیدا نشد | آربایت", robots: { index: false } };
  const title = post.seo.title ?? post.title;
  const description = post.seo.description ?? post.excerpt;
  const url = `/blog/${post.slug}`;
  return {
    title: `${title} | آربایت`,
    description,
    alternates: { canonical: url },
    openGraph: {
      ...SITE_OPEN_GRAPH,
      type: "article",
      title,
      description,
      url,
      publishedTime: post.publishedAt ?? undefined,
      authors: [post.author],
      images: post.cover?.url
        ? [{ url: post.cover.url, alt: post.cover.alt }]
        : undefined,
    },
    twitter: {
      card: post.cover?.url ? "summary_large_image" : "summary",
      title,
      description,
    },
  };
}

/** G-01 — BlogPost.dc.html روی API. دکمه‌ی «ذخیره» طراحی عمداً نیست. */
export default async function BlogPostPage({ params }: PostPageProps) {
  const post = await getBlogPost((await params).slug);
  if (!post) notFound();

  const toc = post.sections.filter((s) => s.heading);
  const url = absoluteUrl(`/blog/${post.slug}`);
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.cover?.url ? [absoluteUrl(post.cover.url)] : undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Person", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "آربایت",
      logo: { "@type": "ImageObject", url: absoluteUrl("/icon.png") },
    },
    mainEntityOfPage: url,
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: blogPage.breadcrumb.home,
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: blogPage.breadcrumb.current,
        item: absoluteUrl("/blog"),
      },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  return (
    <StorefrontShell headerActive="blog">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(articleLd)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(breadcrumbLd)}
      />
      <ReadingProgress
        targetId="blog-article"
        label={blogPostPage.progressLabel}
      />
      <div dir="rtl" className="bg-paper text-primary">
        <article id="blog-article">
          <header className="border-border border-b bg-surface px-[5vw] pt-[clamp(26px,4vh,44px)] pb-[clamp(22px,3vh,32px)]">
            <div className="mx-auto max-w-[760px]">
              <nav
                aria-label="مسیر"
                className="text-secondary mb-4 flex flex-wrap items-center gap-2 text-caption"
              >
                <Link href="/" className="hover:text-primary">
                  {blogPage.breadcrumb.home}
                </Link>
                <span aria-hidden="true">/</span>
                <Link href="/blog" className="hover:text-primary">
                  {blogPage.breadcrumb.current}
                </Link>
                <span aria-hidden="true">/</span>
                <Link
                  href={`/blog?category=${encodeURIComponent(post.category)}`}
                  className="text-primary font-emphasis"
                >
                  {post.category}
                </Link>
              </nav>
              <h1 className="font-heading m-0 text-[clamp(27px,3.6vw,46px)] leading-[1.4] tracking-tight text-pretty">
                {post.title}
              </h1>
              {post.excerpt ? (
                <p className="text-secondary mt-3.5 mb-0 max-w-[60ch] text-[clamp(15px,1.7vw,18px)] leading-[1.9]">
                  {post.excerpt}
                </p>
              ) : null}
              <div className="mt-5.5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="from-brand to-brand-active text-on-dark font-heading flex size-11 flex-none items-center justify-center rounded-full bg-gradient-to-br"
                  >
                    {post.author.trim().charAt(0)}
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-emphasis text-body">
                      {post.author}
                    </span>
                    <span className="text-secondary flex flex-wrap items-center gap-2 text-caption">
                      <span>{formatJalaliLong(post.publishedAt)}</span>
                      <span
                        aria-hidden="true"
                        className="block size-[3px] rounded-full bg-current opacity-40"
                      />
                      <span>
                        {blogPage.readingTime(
                          toPersianDigits(post.readingTime),
                        )}
                      </span>
                    </span>
                  </div>
                </div>
                <CopyLinkButton />
              </div>
            </div>
          </header>

          <div className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-[clamp(18px,3vw,40px)] px-[5vw] pt-[clamp(20px,3vh,32px)] pb-[clamp(40px,6vh,64px)]">
            <div className="mx-auto flex min-w-0 max-w-[760px] flex-[1_1_440px] flex-col gap-[clamp(18px,2.5vh,26px)]">
              {post.cover?.url ? (
                <div className="relative aspect-video overflow-hidden rounded-card-lg bg-gradient-to-br from-secondary-2 to-surface-dark">
                  <Image
                    src={post.cover.url}
                    alt={post.cover.alt}
                    fill
                    priority
                    sizes="(max-width: 800px) 100vw, 760px"
                    className="object-cover"
                  />
                </div>
              ) : null}
              {post.sections.map((section) => (
                <section
                  key={section.id}
                  aria-labelledby={section.heading ? section.id : undefined}
                  className="flex flex-col gap-[clamp(14px,2vh,20px)]"
                >
                  {section.heading ? (
                    <h2
                      id={section.id}
                      className="font-heading m-0 mt-2 scroll-mt-24 text-[clamp(20px,2.3vw,26px)] leading-[1.55] tracking-tight"
                    >
                      {section.heading}
                    </h2>
                  ) : null}
                  {section.html ? (
                    <div
                      className="blog-prose"
                      dangerouslySetInnerHTML={{ __html: section.html }}
                    />
                  ) : null}
                </section>
              ))}
              {post.tags.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/blog?q=${encodeURIComponent(tag)}`}
                      className="border-border text-secondary hover:border-brand-tint-2 hover:text-brand-active flex min-h-11 items-center rounded-tile border bg-surface px-4 text-caption"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              ) : null}
              <div className="border-border flex flex-wrap items-center gap-4 rounded-panel border bg-surface p-5">
                <span
                  aria-hidden="true"
                  className="from-brand to-brand-active text-on-dark font-heading flex size-13 flex-none items-center justify-center rounded-full bg-gradient-to-br text-[19px]"
                >
                  {post.author.trim().charAt(0)}
                </span>
                <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-1">
                  <span className="font-heading text-body">{post.author}</span>
                  {post.authorRole ? (
                    <span className="text-secondary text-body leading-7">
                      {post.authorRole}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            {toc.length >= 2 ? (
              <aside className="sticky top-26 hidden min-w-0 max-w-[260px] flex-[1_1_220px] lg:block">
                <nav
                  aria-label={blogPostPage.toc}
                  className="border-border flex flex-col gap-1 rounded-panel border bg-surface p-4.5"
                >
                  <p className="font-heading m-0 mb-2 text-body">
                    {blogPostPage.toc}
                  </p>
                  {toc.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className="text-body hover:bg-brand-tint-1 hover:text-brand-active flex min-h-11 items-center rounded-[10px] px-3 leading-7"
                    >
                      {s.heading}
                    </a>
                  ))}
                </nav>
              </aside>
            ) : null}
          </div>
        </article>

        {post.related.length > 0 ? (
          <section className="px-[5vw] pb-[clamp(48px,7vh,80px)]">
            <div className="mx-auto flex max-w-[1240px] flex-col gap-[clamp(14px,2vh,20px)]">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 className="font-heading m-0 text-[clamp(20px,2.4vw,28px)] tracking-tight">
                  {blogPostPage.continueReading}
                </h2>
                <Link
                  href="/blog"
                  className="font-emphasis text-body text-brand-active"
                >
                  {blogPostPage.allPosts}
                </Link>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(270px,100%),1fr))] gap-[clamp(14px,2vw,20px)]">
                {post.related.map((r, i) => (
                  <PostCard key={r.slug} post={r} index={i} headingLevel="h3" />
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </StorefrontShell>
  );
}
