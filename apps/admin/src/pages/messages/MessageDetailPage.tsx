import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/Stateviews";
import { getMessage, updateMessage } from "@/lib/api";
import { formatJalaliDateTime } from "@/lib/formatters";
import { useToast } from "@/lib/ToastContext";

export default function MessageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [adminNote, setAdminNote] = useState("");

  const {
    data: message,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["message", id],
    queryFn: () => getMessage(id!),
  });

  useEffect(() => {
    if (message) setAdminNote(message.adminNote);
  }, [message]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["message", id] });
    queryClient.invalidateQueries({ queryKey: ["messages"] });
  };

  const markReadMutation = useMutation({
    mutationFn: () => updateMessage(id!, { isRead: true }),
    onSuccess: invalidate,
  });

  useEffect(() => {
    if (message && !message.isRead) markReadMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message?.id, message?.isRead]);

  const toggleReadMutation = useMutation({
    mutationFn: (isRead: boolean) => updateMessage(id!, { isRead }),
    onSuccess: () => {
      invalidate();
      toast.showSuccess("وضعیت پیام تغییر کرد.");
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "ذخیره ناموفق بود.",
      ),
  });

  const noteMutation = useMutation({
    mutationFn: () => updateMessage(id!, { adminNote }),
    onSuccess: () => {
      invalidate();
      toast.showSuccess("یادداشت ذخیره شد.");
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "ذخیره ناموفق بود.",
      ),
  });

  if (isError)
    return (
      <ErrorState
        description="دریافت پیام ناموفق بود."
        onRetry={() => refetch()}
      />
    );
  if (isPending || !message) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={message.subject || "پیام تماس"}
        description={`${message.name} · ${formatJalaliDateTime(message.submittedAt)}`}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => toggleReadMutation.mutate(!message.isRead)}
            disabled={toggleReadMutation.isPending}
          >
            {message.isRead
              ? "علامت‌گذاری به‌عنوان نخوانده"
              : "علامت‌گذاری به‌عنوان خوانده‌شده"}
          </Button>
        }
      />

      <section className="glass-card p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Chip tone={message.isRead ? "neutral" : "brand"} dot>
            {message.isRead ? "خوانده‌شده" : "خوانده‌نشده"}
          </Chip>
          {message.newsletter && <Chip tone="success">عضو خبرنامه</Chip>}
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[11px] text-slate-500">نام</dt>
            <dd className="m-0 text-slate-200">{message.name}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-slate-500">ایمیل</dt>
            <dd className="m-0 text-slate-200" dir="ltr">
              {message.email}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-slate-500">شماره تماس</dt>
            <dd className="m-0 text-slate-200" dir="ltr">
              {message.phone || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-slate-500">آی‌پی</dt>
            <dd className="m-0 text-slate-200" dir="ltr">
              {message.ipAddress || "—"}
            </dd>
          </div>
        </dl>
        <div className="mt-4">
          <p className="text-[11px] text-slate-500">متن پیام</p>
          <p className="m-0 whitespace-pre-wrap rounded-xl border border-white/[0.06] bg-ink-800/40 p-4 text-sm leading-7 text-slate-200">
            {message.message}
          </p>
        </div>
      </section>

      <section className="glass-card p-6">
        <h2 className="m-0 text-sm font-bold text-white">یادداشت ادمین</h2>
        <Textarea
          className="mt-3"
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder="یادداشت داخلی — برای مشتری نمایش داده نمی‌شود"
        />
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            disabled={noteMutation.isPending || adminNote === message.adminNote}
            onClick={() => noteMutation.mutate()}
          >
            {noteMutation.isPending ? "در حال ذخیره…" : "ذخیره یادداشت"}
          </Button>
        </div>
      </section>
    </div>
  );
}
