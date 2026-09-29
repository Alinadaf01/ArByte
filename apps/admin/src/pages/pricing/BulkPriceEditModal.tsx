import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { bulkEditPrices } from "@/lib/api";
import {
  bulkPriceEditFormSchema,
  BULK_PRICE_EDIT_MODE_LABELS,
  type BulkPriceEditFormValues,
} from "@/lib/pricingSchema";
import { formatPrice } from "@/lib/formatters";
import { useToast } from "@/lib/ToastContext";
import type { PriceChange } from "@/types/pricing";

export function BulkPriceEditModal({
  open,
  productIds,
  onClose,
  onApplied,
}: {
  open: boolean;
  productIds: number[];
  onClose: () => void;
  onApplied: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [changes, setChanges] = useState<PriceChange[] | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BulkPriceEditFormValues>({
    resolver: zodResolver(bulkPriceEditFormSchema),
    defaultValues: {
      mode: "percent",
      direction: "increase",
      value: 0,
      roundToNearest1000: false,
      reason: "",
    },
  });
  const mode = watch("mode");

  const previewMutation = useMutation({
    mutationFn: (values: BulkPriceEditFormValues) =>
      bulkEditPrices({ productIds, ...values }, true),
    onSuccess: (data) => setChanges(data.changes),
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "پیش‌نمایش ناموفق بود.",
      ),
  });

  const applyMutation = useMutation({
    mutationFn: (values: BulkPriceEditFormValues) =>
      bulkEditPrices({ productIds, ...values }, false),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["product-prices"] });
      toast.showSuccess(
        `قیمت ${data.changes.length.toLocaleString("fa-IR")} محصول به‌روزرسانی شد.`,
      );
      handleClose();
      onApplied();
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "اعمال تغییر ناموفق بود.",
      ),
  });

  function handleClose() {
    setChanges(null);
    reset();
    onClose();
  }

  const unchangedCount = productIds.length - (changes?.length ?? 0);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="ویرایش گروهی قیمت"
      widthClass="max-w-lg"
    >
      {changes === null ? (
        <form
          onSubmit={handleSubmit((values) => previewMutation.mutate(values))}
          className="flex flex-col gap-4"
        >
          <p className="m-0 text-xs text-slate-500">
            {productIds.length.toLocaleString("fa-IR")} محصول انتخاب شده.
          </p>
          <Field label="حالت" htmlFor="bpe-mode" required>
            <Select id="bpe-mode" {...register("mode")}>
              {Object.entries(BULK_PRICE_EDIT_MODE_LABELS).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </Select>
          </Field>
          {mode !== "set" && (
            <Field
              label="جهت تغییر"
              htmlFor="bpe-direction"
              required
              error={errors.direction?.message}
            >
              <Select id="bpe-direction" {...register("direction")}>
                <option value="increase">افزایش</option>
                <option value="decrease">کاهش</option>
              </Select>
            </Field>
          )}
          <Field
            label={
              mode === "percent"
                ? "درصد"
                : mode === "set"
                  ? "قیمت جدید (تومان)"
                  : "مبلغ (تومان)"
            }
            htmlFor="bpe-value"
            required
            error={errors.value?.message}
          >
            <Input
              id="bpe-value"
              type="number"
              min={0}
              {...register("value")}
            />
          </Field>
          <Switch
            checked={watch("roundToNearest1000")}
            onChange={(v) =>
              setValue("roundToNearest1000", v, { shouldDirty: true })
            }
            label="گرد کردن به نزدیک‌ترین ۱۰۰۰ تومان"
          />
          <Field
            label="دلیل تغییر"
            htmlFor="bpe-reason"
            hint="اختیاری — در تاریخچه قیمت ثبت می‌شود."
          >
            <Textarea id="bpe-reason" {...register("reason")} />
          </Field>
          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={handleClose}>
              انصراف
            </Button>
            <Button type="submit" disabled={previewMutation.isPending}>
              {previewMutation.isPending ? "در حال محاسبه…" : "پیش‌نمایش"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          {changes.length === 0 ? (
            <p className="m-0 text-sm text-slate-400">
              با این تنظیمات، قیمت هیچ محصولی تغییر نمی‌کند.
            </p>
          ) : (
            <>
              <div className="max-h-80 overflow-y-auto rounded-xl border border-white/[0.06]">
                <table className="w-full text-start text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                      <th className="px-4 py-2.5 font-medium">محصول</th>
                      <th className="px-4 py-2.5 font-medium">قیمت فعلی</th>
                      <th className="px-4 py-2.5 font-medium">قیمت جدید</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {changes.map((change) => (
                      <tr key={change.productId}>
                        <td className="px-4 py-2.5 font-semibold text-white">
                          {change.name}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 line-through">
                          {formatPrice(change.oldPrice)}
                        </td>
                        <td
                          className={
                            change.newPrice > change.oldPrice
                              ? "px-4 py-2.5 font-bold text-success"
                              : "px-4 py-2.5 font-bold text-danger"
                          }
                        >
                          {formatPrice(change.newPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {unchangedCount > 0 && (
                <p className="m-0 text-[11px] text-slate-500">
                  {unchangedCount.toLocaleString("fa-IR")} محصول دیگر بدون تغییر
                  باقی می‌ماند.
                </p>
              )}
            </>
          )}
          <div className="mt-2 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setChanges(null)}
            >
              بازگشت
            </Button>
            <Button
              type="button"
              disabled={applyMutation.isPending || changes.length === 0}
              onClick={() => applyMutation.mutate(watch())}
            >
              {applyMutation.isPending ? "در حال اعمال…" : "اعمال تغییرات"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
