import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { createStockMovement, listProducts } from "@/lib/api";
import {
  createMovementFormSchema,
  type CreateMovementFormSchemaValues,
} from "@/lib/inventorySchema";
import {
  MANUAL_STOCK_MOVEMENT_TYPES,
  STOCK_MOVEMENT_TYPE_LABELS,
} from "@/types/inventory";
import { useToast } from "@/lib/ToastContext";

export function CreateMovementModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: products } = useQuery({
    queryKey: ["products", "for-movement-picker"],
    queryFn: () => listProducts({ pageSize: 100 }),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateMovementFormSchemaValues>({
    resolver: zodResolver(createMovementFormSchema),
    defaultValues: { productId: null, type: "purchase", quantity: 1, note: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateMovementFormSchemaValues) =>
      createStockMovement(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
      toast.showSuccess("حرکت انبار ثبت شد.");
      reset({ productId: null, type: "purchase", quantity: 1, note: "" });
      onClose();
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "ثبت ناموفق بود.",
      ),
  });

  return (
    <Modal open={open} onClose={onClose} title="ثبت حرکت دستی انبار">
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-col gap-4"
      >
        <Field
          label="محصول"
          htmlFor="mv-product"
          required
          error={errors.productId?.message}
        >
          <Select
            id="mv-product"
            value={watch("productId") ?? ""}
            onChange={(e) =>
              setValue(
                "productId",
                e.target.value ? Number(e.target.value) : null,
                { shouldDirty: true },
              )
            }
          >
            <option value="">— انتخاب کنید —</option>
            {(products?.results ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="نوع حرکت"
            htmlFor="mv-type"
            required
            error={errors.type?.message}
          >
            <Select id="mv-type" {...register("type")}>
              {MANUAL_STOCK_MOVEMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {STOCK_MOVEMENT_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="تعداد"
            htmlFor="mv-qty"
            required
            error={errors.quantity?.message}
          >
            <Input
              id="mv-qty"
              type="number"
              min={1}
              {...register("quantity")}
            />
          </Field>
        </div>
        <Field label="یادداشت" htmlFor="mv-note" error={errors.note?.message}>
          <Textarea id="mv-note" {...register("note")} placeholder="اختیاری" />
        </Field>
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            انصراف
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "در حال ثبت…" : "ثبت"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
