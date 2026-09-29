import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pagination } from "@/components/ui/Pagination";
import { BlogFormModal } from "@/pages/blog/BlogFormModal";
import { listBlogPosts, deleteBlogPost } from "@/lib/api";
import { useQueryFilters } from "@/lib/useQueryFilters";
import { useToast } from "@/lib/ToastContext";
import type { AdminBlogPost } from "@/types/blog";

const PAGE_SIZE = 12;

export default function BlogPage() {
  const [filters, setFilters] = useQueryFilters({ page: "1" });
  const page = Number(filters.page) || 1;
  const queryClient = useQueryClient();
  const toast = useToast();
  const [formTarget, setFormTarget] = useState<AdminBlogPost | "new" | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<AdminBlogPost | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["blog-posts", filters],
    queryFn: () => listBlogPosts({ page, pageSize: PAGE_SIZE }),
  });

  const posts = data?.results ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBlogPost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      toast.showSuccess("مطلب حذف شد.");
      setDeleteTarget(null);
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "حذف ناموفق بود.",
      ),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="بلاگ"
        description="مدیریت مطالب بلاگ با ویرایشگر بخش‌بندی‌شده."
        actions={
          <Button onClick={() => setFormTarget("new")}>+ افزودن مطلب</Button>
        }
      />

      <section className="glass-card overflow-hidden p-0">
        {isError ? (
          <ErrorState
            description="دریافت مطالب ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && posts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="مطلبی یافت نشد"
            description="هنوز مطلبی ثبت نشده."
            action={
              <Button onClick={() => setFormTarget("new")}>
                + افزودن مطلب
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-start text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                    <th className="px-6 py-3 font-medium">مطلب</th>
                    <th className="px-4 py-3 font-medium">دسته‌بندی</th>
                    <th className="px-4 py-3 font-medium">نویسنده</th>
                    <th className="px-4 py-3 font-medium">وضعیت</th>
                    <th className="px-4 py-3 font-medium">عملیات</th>
                  </tr>
                </thead>
                {isPending ? (
                  <TableSkeleton rows={6} cols={5} />
                ) : (
                  <tbody className="divide-y divide-white/[0.04]">
                    {posts.map((post) => (
                      <tr key={post.id}>
                        <td className="px-6 py-3">
                          <p className="m-0 font-semibold text-white">
                            {post.title}
                          </p>
                          <p
                            className="m-0 text-[11px] text-slate-500"
                            dir="ltr"
                          >
                            {post.slug}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {post.category}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {post.author}
                        </td>
                        <td className="px-4 py-3">
                          <Chip
                            tone={post.isPublished ? "success" : "neutral"}
                            dot
                          >
                            {post.isPublished ? "منتشرشده" : "پیش‌نویس"}
                          </Chip>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setFormTarget(post)}
                              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-brand-500/30 hover:text-brand-300"
                            >
                              ویرایش
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(post)}
                              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:border-danger/40"
                            >
                              حذف
                            </button>
                          </div>
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

      <BlogFormModal
        post={formTarget && formTarget !== "new" ? formTarget : null}
        open={!!formTarget}
        onClose={() => setFormTarget(null)}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title={`حذف «${deleteTarget?.title ?? ""}»`}
        description="این عملیات قابل بازگشت نیست."
        confirmLabel="حذف"
        pending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
