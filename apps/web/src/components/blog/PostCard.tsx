import Image from "next/image";
import Link from "next/link";
import { blogPage, toPersianDigits } from "@arbyte/contracts";
import type { BlogPostCard } from "@arbyte/contracts";
import { formatJalaliLong } from "@/lib/jalali";

const WELLS = [
  "bg-gradient-to-br from-brand-tint-4 to-brand-tint-2",
  "bg-gradient-to-br from-brand-tint-3 to-surface",
];

export function PostMeta({
  post,
  className = "",
}: {
  post: BlogPostCard;
  className?: string;
}) {
  const bits = [
    post.author,
    formatJalaliLong(post.publishedAt),
    blogPage.readingTime(toPersianDigits(post.readingTime)),
  ].filter(Boolean);
  return (
    <p
      className={`m-0 flex flex-wrap items-center gap-2 text-caption ${className}`}
    >
      {bits.map((bit, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && (
            <span
              aria-hidden="true"
              className="block size-[3px] rounded-full bg-current opacity-40"
            />
          )}
          {bit}
        </span>
      ))}
    </p>
  );
}

/** G-01 — کارت نوشته (Blog.dc.html)؛ بدون کاور، همان پس‌زمینه‌ی گرادیانی طراحی. */
export function PostCard({
  post,
  index = 0,
  headingLevel = "h2",
}: {
  post: BlogPostCard;
  index?: number;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  const href = `/blog/${post.slug}`;
  return (
    <article className="border-border hover:border-brand-tint-2 flex flex-col overflow-hidden rounded-card border bg-surface transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-popover">
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden="true"
        className={`relative block aspect-video ${WELLS[index % 2]}`}
      >
        {post.cover?.url ? (
          <Image
            src={post.cover.url}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        ) : null}
        <span className="text-caption text-brand-active font-emphasis absolute top-3 start-3 rounded-pill bg-surface/95 px-3 py-1 backdrop-blur">
          {post.category}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-2.5 p-4.5">
        <Heading className="text-card-title text-primary font-heading m-0 leading-7 text-pretty">
          <Link href={href} className="hover:text-brand-active">
            {post.title}
          </Link>
        </Heading>
        {post.excerpt ? (
          <p className="text-body text-secondary m-0 leading-8">
            {post.excerpt}
          </p>
        ) : null}
        <PostMeta
          post={post}
          className="text-secondary-2 border-border-divider mt-auto border-t pt-3"
        />
      </div>
    </article>
  );
}
