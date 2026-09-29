"use client";

import { useCallback, useEffect, useState } from "react";
import { productReviews as t, toPersianDigits } from "@arbyte/contracts";
import type { ProductReview, ProductReviewsResponse } from "@arbyte/contracts";
import { formatJalaliLong } from "@/lib/jalali";

const PER_PAGE = 5;

function Stars({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`text-warning tracking-[2px] ${className}`}
    >
      {"★".repeat(Math.round(value))}
      <span className="text-border-input">
        {"★".repeat(5 - Math.round(value))}
      </span>
    </span>
  );
}

/**
 * G-01 — نظرات تأییدشده + فرم ثبت فقط برای خریدار (سفارش DELIVERED). وضعیت
 * «می‌تواند نظر بدهد» را سرور از کوکی نشست (از مسیر BFF) تعیین می‌کند.
 */
export function ProductReviews({ productSlug }: { productSlug: string }) {
  const [items, setItems] = useState<ProductReview[]>([]);
  const [meta, setMeta] = useState<ProductReviewsResponse["meta"] | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(
    async (nextPage: number) => {
      try {
        const res = await fetch(
          `/api/proxy/catalog/products/${encodeURIComponent(productSlug)}/reviews?page=${nextPage}&perPage=${PER_PAGE}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const body = (await res.json()) as ProductReviewsResponse;
        setItems((prev) =>
          nextPage === 1 ? body.data : [...prev, ...body.data],
        );
        setMeta(body.meta);
        setPage(nextPage);
      } catch {
        /* بخش نظرات اختیاری است؛ خطای شبکه صفحه را خراب نمی‌کند. */
      }
    },
    [productSlug],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  if (!meta) return null;
  const { rating, viewer, pagination } = meta;

  return (
    <section
      aria-labelledby="reviews-title"
      className="border-border flex flex-col gap-4 rounded-card border bg-surface p-[clamp(18px,3vw,28px)]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2
          id="reviews-title"
          className="text-subhead text-primary font-heading m-0 tracking-tight"
        >
          {t.title}
        </h2>
        {rating.count > 0 && rating.average != null ? (
          <p className="text-caption text-secondary m-0 flex items-center gap-2">
            <Stars value={rating.average} />
            {t.summary(
              toPersianDigits(rating.average.toFixed(1)),
              toPersianDigits(rating.count),
            )}
          </p>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="text-body text-secondary m-0">{t.empty}</p>
      ) : null}

      <ul className="m-0 flex list-none flex-col p-0">
        {items.map((r) => (
          <li
            key={r.id}
            className="border-border-divider flex flex-col gap-2 border-t py-4 first:border-t-0 first:pt-0"
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <Stars value={r.rating} className="text-caption" />
              <span className="sr-only">
                {t.star(toPersianDigits(r.rating))}
              </span>
              <span className="text-body text-primary font-emphasis">
                {r.authorName}
              </span>
              {r.verifiedPurchase ? (
                <span className="bg-brand-tint-1 text-brand-active rounded-pill px-2.5 py-0.5 text-micro font-emphasis">
                  {t.verified}
                </span>
              ) : null}
              <span className="text-caption text-secondary ms-auto">
                {formatJalaliLong(r.createdAt)}
              </span>
            </div>
            {r.title ? (
              <p className="text-body text-primary font-emphasis m-0">
                {r.title}
              </p>
            ) : null}
            <p className="text-body text-secondary-2 m-0 leading-8 whitespace-pre-line">
              {r.body}
            </p>
            {r.adminReply ? (
              <div className="bg-paper border-brand rounded-tile border-s-2 px-4 py-3">
                <p className="text-caption text-brand-active font-emphasis m-0 mb-1">
                  {t.adminReply}
                </p>
                <p className="text-caption text-secondary-2 m-0 leading-7 whitespace-pre-line">
                  {r.adminReply}
                </p>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {pagination.page < pagination.totalPages ? (
        <button
          type="button"
          onClick={() => void load(page + 1)}
          className="border-border-input text-primary font-emphasis self-center rounded-pill border px-5 py-2.5 text-caption"
        >
          {t.loadMore}
        </button>
      ) : null}

      {viewer.canReview ? (
        <ReviewForm productSlug={productSlug} />
      ) : viewer.hasReviewed ? (
        <p className="text-caption text-secondary m-0">{t.alreadyReviewed}</p>
      ) : null}
    </section>
  );
}

function ReviewForm({ productSlug }: { productSlug: string }) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "invalid" | "error"
  >("idle");

  if (status === "sent") {
    return (
      <p
        role="status"
        className="text-body text-accent-deep bg-brand-tint-3 m-0 rounded-tile px-4 py-3"
      >
        {t.submitted}
      </p>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || body.trim().length < 10) return setStatus("invalid");
    setStatus("sending");
    try {
      const res = await fetch(
        `/api/proxy/catalog/products/${encodeURIComponent(productSlug)}/reviews`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            rating,
            title: title.trim(),
            body: body.trim(),
          }),
        },
      );
      setStatus(res.ok ? "sent" : res.status === 400 ? "invalid" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      className="border-border-divider flex flex-col gap-3 border-t pt-4"
    >
      <h3 className="text-body text-primary font-heading m-0">{t.formTitle}</h3>
      <fieldset className="m-0 flex items-center gap-1 border-0 p-0">
        <legend className="text-caption text-secondary mb-1.5">
          {t.ratingLabel}
        </legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={rating === n}
            aria-label={t.star(toPersianDigits(n))}
            onClick={() => setRating(n)}
            className={`flex size-11 items-center justify-center rounded-tile-sm text-[22px] ${n <= rating ? "text-warning" : "text-border-input"}`}
          >
            ★
          </button>
        ))}
      </fieldset>
      <label className="text-caption text-secondary flex flex-col gap-1.5">
        {t.titleLabel}
        <input
          value={title}
          maxLength={150}
          onChange={(e) => setTitle(e.target.value)}
          className="border-border-input text-input text-primary min-h-11 rounded-tile-sm border bg-surface px-3"
        />
      </label>
      <label className="text-caption text-secondary flex flex-col gap-1.5">
        {t.bodyLabel}
        <textarea
          value={body}
          rows={4}
          maxLength={3000}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t.bodyPlaceholder}
          aria-invalid={status === "invalid" && body.trim().length < 10}
          className="border-border-input text-input text-primary rounded-tile-sm border bg-surface px-3 py-2.5 leading-7"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={status === "sending"}
          className="bg-primary text-on-dark hover:bg-brand font-emphasis min-h-11 rounded-pill px-6 text-caption disabled:opacity-60"
        >
          {status === "sending" ? t.sending : t.submit}
        </button>
        {status === "invalid" || status === "error" ? (
          <p role="alert" className="text-caption text-danger m-0">
            {status === "invalid" ? t.invalid : t.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
