import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardZone } from "@/pages/dashboard/DashboardZone";
import { Button } from "@/components/ui/Button";
import { markDashboardSeen } from "@/lib/api";
import { useToast } from "@/lib/ToastContext";
import { formatJalaliDateTime, formatRelativeTime } from "@/lib/formatters";
import type { FeedItem, SinceLastVisit } from "@/types/dashboard";

const TYPE_LABELS: Record<FeedItem["type"], string> = {
  order: "سفارش",
  user: "کاربر",
  review: "نظر",
  message: "پیام",
  return: "مرجوعی",
  activity: "فعالیت ادمین",
};

// Only orders/users/messages have a per-record detail route; reviews and
// returns are handled inline in their list pages (no /reviews/:id route
// exists), so those two link to the list itself rather than a 404.
const TYPES_WITH_DETAIL_ROUTE: FeedItem["type"][] = [
  "order",
  "user",
  "message",
];

function feedItemHref(item: FeedItem): string {
  if (!item.link) return "";
  return TYPES_WITH_DETAIL_ROUTE.includes(item.type)
    ? `${item.link.path}/${item.link.id}`
    : item.link.path;
}

export function SinceLastVisitZone({ data }: { data: SinceLastVisit }) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: markDashboardSeen,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.showSuccess("همه موارد به‌عنوان دیده‌شده علامت خوردند.");
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "عملیات ناموفق بود.",
      ),
  });

  return (
    <DashboardZone
      title="از آخرین ورود شما"
      description={
        data.lastVisitAt
          ? `از ${formatJalaliDateTime(data.lastVisitAt)}`
          : "این اولین بازدید شماست."
      }
      actions={
        <Button
          size="sm"
          variant="secondary"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending
            ? "در حال ثبت…"
            : "علامت‌زدن همه به‌عنوان دیده‌شده"}
        </Button>
      }
    >
      {data.feed.length === 0 ? (
        <p className="m-0 text-sm text-slate-500">
          تغییری از آخرین بازدید شما ثبت نشده.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {data.feed.map((item) => {
            const content = (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-ink-800/40 px-4 py-3 transition-colors hover:border-brand-500/30">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                    {TYPE_LABELS[item.type]}
                  </span>
                  <span className="text-sm text-slate-200">{item.summary}</span>
                </div>
                <span className="shrink-0 text-[11px] text-slate-500">
                  {formatRelativeTime(item.createdAt)}
                </span>
              </div>
            );
            return (
              <li key={`${item.type}-${item.id}`}>
                {item.link ? (
                  <Link to={feedItemHref(item)}>{content}</Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      )}
    </DashboardZone>
  );
}
