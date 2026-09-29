import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Field, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { updateReview } from "@/lib/api";
import { useToast } from "@/lib/ToastContext";
import { REVIEW_STATUS_LABELS, type AdminProductReview } from "@/types/review";

export function ReviewReplyModal({
  review,
  productName,
  onClose,
}: {
  review: AdminProductReview | null;
  productName: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [adminReply, setAdminReply] = useState("");

  useEffect(() => {
    setAdminReply(review?.adminReply ?? "");
  }, [review]);

  const mutation = useMutation({
    mutationFn: (
      data: Partial<{
        status: AdminProductReview["status"];
        adminReply: string;
      }>,
    ) => updateReview(review!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.showSuccess("نظر ذخیره شد.");
      onClose();
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "ذخیره ناموفق بود.",
      ),
  });

  if (!review) return null;

  return (
    <Modal
      open={!!review}
      onClose={onClose}
      title={`نظر روی «${productName}»`}
      widthClass="max-w-lg"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Chip tone="brand">{"★".repeat(review.rating)}</Chip>
          <Chip
            tone={
              review.status === "approved"
                ? "success"
                : review.status === "rejected"
                  ? "danger"
                  : "warning"
            }
          >
            {REVIEW_STATUS_LABELS[review.status]}
          </Chip>
          {review.verifiedPurchase && <Chip tone="neutral">خرید تأییدشده</Chip>}
        </div>
        {review.title && (
          <p className="m-0 text-sm font-bold text-white">{review.title}</p>
        )}
        <p className="m-0 rounded-xl border border-white/[0.06] bg-ink-800/40 p-4 text-sm leading-7 text-slate-300">
          {review.body || "بدون متن"}
        </p>
        <Field label="پاسخ ادمین" htmlFor="review-reply">
          <Textarea
            id="review-reply"
            value={adminReply}
            onChange={(e) => setAdminReply(e.target.value)}
          />
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {review.status !== "approved" && (
              <Button
                size="sm"
                disabled={mutation.isPending}
                onClick={() =>
                  mutation.mutate({ status: "approved", adminReply })
                }
              >
                تأیید
              </Button>
            )}
            {review.status !== "rejected" && (
              <Button
                size="sm"
                variant="danger"
                disabled={mutation.isPending}
                onClick={() =>
                  mutation.mutate({ status: "rejected", adminReply })
                }
              >
                رد
              </Button>
            )}
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ adminReply })}
          >
            {mutation.isPending ? "در حال ذخیره…" : "ذخیره پاسخ"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
