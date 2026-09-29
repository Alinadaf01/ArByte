import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Switch } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { updateStockAlert } from "@/lib/api";
import {
  stockAlertFormSchema,
  type StockAlertFormValues,
} from "@/lib/inventorySchema";
import { useToast } from "@/lib/ToastContext";
import type { InventoryRow } from "@/types/inventory";

export function StockAlertFormModal({
  row,
  onClose,
}: {
  row: InventoryRow | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StockAlertFormValues>({
    resolver: zodResolver(stockAlertFormSchema),
    defaultValues: { reorderPoint: 0, isActive: true },
  });

  useEffect(() => {
    if (!row) return;
    reset({
      reorderPoint: row.reorderPoint ?? 0,
      isActive: row.reorderPoint !== null,
    });
  }, [row, reset]);

  const mutation = useMutation({
    mutationFn: (values: StockAlertFormValues) =>
      updateStockAlert(row!.product.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
      toast.showSuccess("هشدار موجودی ذخیره شد.");
      onClose();
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "ذخیره ناموفق بود.",
      ),
  });

  if (!row) return null;

  return (
    <Modal
      open={!!row}
      onClose={onClose}
      title={`هشدار موجودی «${row.product.name}»`}
      widthClass="max-w-sm"
    >
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-col gap-4"
      >
        <Field
          label="نقطه سفارش"
          htmlFor="alert-reorder"
          error={errors.reorderPoint?.message}
          hint="وقتی موجودی به این عدد برسد، هشدار فعال می‌شود."
        >
          <Input
            id="alert-reorder"
            type="number"
            {...register("reorderPoint")}
          />
        </Field>
        <Switch
          checked={watch("isActive")}
          onChange={(v) => setValue("isActive", v, { shouldDirty: true })}
          label="هشدار فعال"
        />
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            انصراف
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "در حال ذخیره…" : "ذخیره"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
