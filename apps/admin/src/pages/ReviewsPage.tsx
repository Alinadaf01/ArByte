import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Field";
import { Chip } from "@/components/ui/Chip";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { Pagination } from "@/components/ui/Pagination";
import { ReviewReplyModal } from "@/pages/reviews/ReviewReplyModal";
import { listReviews, listProducts } from "@/lib/api";
import { useQueryFilters } from "@/lib/useQueryFilters";
import { formatJalaliDateTime } from "@/lib/formatters";
import { REVIEW_STATUS_LABELS, type AdminProductReview } from "@/types/review";

const PAGE_SIZE = 12;

export default function ReviewsPage() {
  const [filters, setFilters] = useQueryFilters({ page: "1", status: "" });
  const page = Number(filters.page) || 1;
  const [replyTarget, setReplyTarget] = useState<AdminProductReview | null>(
    null,
  );

  const { data: products } = useQuery({
    queryKey: ["products", "for-review-lookup"],
    queryFn: () => listProducts({ pageSize: 100 }),
  });
  const productsById = useMemo(
    () => new Map((products?.results ?? []).map((p) => [Number(p.id), p])),
    [products],
  );

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["reviews", filters],
    queryFn: () =>
      listReviews({
        page,
        pageSize: PAGE_SIZE,
        status: filters.status || undefined,
      }),
  });

  const reviews = data?.results ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="نظرات"
        description="تأیید یا رد نظرات کاربران، همراه با پاسخ ادمین."
      />

      <section className="glass-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-6 py-4">
          <Select
            className="w-auto"
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value, page: "1" })}
          >
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(REVIEW_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        {isError ? (
          <ErrorState
            description="دریافت نظرات ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && reviews.length === 0 ? (
          <EmptyState
            icon={Star}
            title="نظری یافت نشد"
            description="با فیلترهای فعلی نظری پیدا نشد."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-start text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                    <th className="px-6 py-3 font-medium">محصول</th>
                    <th className="px-4 py-3 font-medium">کاربر</th>
                    <th className="px-4 py-3 font-medium">امتیاز</th>
                    <th className="px-4 py-3 font-medium">وضعیت</th>
                    <th className="px-4 py-3 font-medium">تاریخ</th>
                    <th className="px-4 py-3 font-medium">عملیات</th>
                  </tr>
                </thead>
                {isPending ? (
                  <TableSkeleton rows={6} cols={6} />
                ) : (
                  <tbody className="divide-y divide-white/[0.04]">
                    {reviews.map((review) => (
                      <tr key={review.id}>
                        <td className="px-6 py-3 font-semibold text-white">
                          {productsById.get(review.product)?.name ??
                            `#${review.product}`}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {review.user ?? "مهمان"}
                        </td>
                        <td className="px-4 py-3 text-warning">
                          {"★".repeat(review.rating)}
                        </td>
                        <td className="px-4 py-3">
                          <Chip
                            tone={
                              review.status === "approved"
                                ? "success"
                                : review.status === "rejected"
                                  ? "danger"
                                  : "warning"
                            }
                            dot
                          >
                            {REVIEW_STATUS_LABELS[review.status]}
                          </Chip>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {formatJalaliDateTime(review.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setReplyTarget(review)}
                            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-brand-500/30 hover:text-brand-300"
                          >
                            بررسی و پاسخ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>
            {data && (
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                count={data.count}
                onPageChange={(p) => setFilters({ page: String(p) })}
              />
            )}
          </>
        )}
      </section>

      <ReviewReplyModal
        review={replyTarget}
        productName={
          replyTarget
            ? (productsById.get(replyTarget.product)?.name ??
              `#${replyTarget.product}`)
            : ""
        }
        onClose={() => setReplyTarget(null)}
      />
    </div>
  );
}
