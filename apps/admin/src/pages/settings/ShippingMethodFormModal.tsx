import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Switch } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import {
  createShippingMethod,
  updateShippingMethod,
  ApiFieldError,
} from "@/lib/api";
import {
  shippingMethodFormSchema,
  type ShippingMethodFormValues,
} from "@/lib/settingsSchema";
import { useToast } from "@/lib/ToastContext";
import type { ShippingMethod } from "@/types/settings";

export function ShippingMethodFormModal({
  open,
  onClose,
  method,
}: {
  open: boolean;
  onClose: () => void;
  method: ShippingMethod | null;
}) {
  const isEdit = !!method;
  const queryClient = useQueryClient();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ShippingMethodFormValues>({
    resolver: zodResolver(shippingMethodFormSchema),
    defaultValues: {
      name: "",
      cost: 0,
      freeAbove: null,
      estimatedDays: "",
      isActive: true,
      order: 0,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      method
        ? {
            name: method.name,
            cost: method.cost,
            freeAbove: method.freeAbove,
            estimatedDays: method.estimatedDays,
            isActive: method.isActive,
            order: method.order,
          }
        : {
            name: "",
            cost: 0,
            freeAbove: null,
            estimatedDays: "",
            isActive: true,
            order: 0,
          },
    );
  }, [open, method, reset]);

  const mutation = useMutation({
    mutationFn: async (values: ShippingMethodFormValues) =>
      isEdit
        ? updateShippingMethod(method!.id, values)
        : createShippingMethod(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-methods"] });
      toast.showSuccess(
        isEdit ? "روش ارسال ویرایش شد." : "روش ارسال ایجاد شد.",
      );
      onClose();
    },
    onError: (error: unknown) => {
      if (error instanceof ApiFieldError && error.field !== "detail") {
        setError(error.field as keyof ShippingMethodFormValues, {
          message: error.message,
        });
      } else {
        toast.showError(
          error instanceof Error ? error.message : "ذخیره ناموفق بود.",
        );
      }
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "ویرایش روش ارسال" : "روش ارسال جدید"}
    >
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-col gap-4"
      >
        <Field
          label="نام"
          htmlFor="ship-name"
          required
          error={errors.name?.message}
        >
          <Input id="ship-name" {...register("name")} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="هزینه (تومان)"
            htmlFor="ship-cost"
            required
            error={errors.cost?.message}
          >
            <Input id="ship-cost" type="number" {...register("cost")} />
          </Field>
          <Field
            label="رایگان بالای (تومان)"
            htmlFor="ship-free-above"
            error={errors.freeAbove?.message}
            hint="اختیاری"
          >
            <Input
              id="ship-free-above"
              type="number"
              value={watch("freeAbove") ?? ""}
              onChange={(e) =>
                setValue(
                  "freeAbove",
                  e.target.value === "" ? null : Number(e.target.value),
                  { shouldDirty: true },
                )
              }
            />
          </Field>
        </div>
        <Field
          label="زمان تخمینی"
          htmlFor="ship-days"
          error={errors.estimatedDays?.message}
          hint="مثال: ۲ تا ۴ روز کاری"
        >
          <Input id="ship-days" {...register("estimatedDays")} />
        </Field>
        <Field label="ترتیب" htmlFor="ship-order" error={errors.order?.message}>
          <Input id="ship-order" type="number" {...register("order")} />
        </Field>
        <Switch
          checked={watch("isActive")}
          onChange={(v) => setValue("isActive", v, { shouldDirty: true })}
          label="فعال"
        />

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            انصراف
          </Button>
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? "در حال ذخیره…" : "ذخیره"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
