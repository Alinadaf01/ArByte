import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Switch } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import {
  createCoupon,
  updateCoupon,
  listCategories,
  listProducts,
} from "@/lib/api";
import {
  couponFormSchema,
  type CouponFormSchemaValues,
} from "@/lib/couponSchema";
import { useToast } from "@/lib/ToastContext";
import type { AdminCoupon } from "@/types/coupon";

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function CouponFormModal({
  coupon,
  open,
  onClose,
}: {
  coupon: AdminCoupon | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEdit = !!coupon;

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories({ pageSize: 100 }),
    enabled: open,
  });
  const { data: products } = useQuery({
    queryKey: ["products", "for-coupon-picker"],
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
  } = useForm<CouponFormSchemaValues>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: {
      code: "",
      type: "percent",
      value: 10,
      minOrderValue: 0,
      maxDiscount: null,
      usageLimit: null,
      perUserLimit: null,
      startsAt: null,
      endsAt: null,
      categories: [],
      products: [],
      isActive: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (coupon) {
      reset({
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minOrderValue: coupon.minOrderValue,
        maxDiscount: coupon.maxDiscount,
        usageLimit: coupon.usageLimit,
        perUserLimit: coupon.perUserLimit,
        startsAt: toDateInputValue(coupon.startsAt) || null,
        endsAt: toDateInputValue(coupon.endsAt) || null,
        categories: coupon.categories,
        products: coupon.products,
        isActive: coupon.isActive,
      });
    } else {
      reset({
        code: "",
        type: "percent",
        value: 10,
        minOrderValue: 0,
        maxDiscount: null,
        usageLimit: null,
        perUserLimit: null,
        startsAt: null,
        endsAt: null,
        categories: [],
        products: [],
        isActive: true,
      });
    }
  }, [open, coupon, reset]);

  const mutation = useMutation({
    mutationFn: (values: CouponFormSchemaValues) =>
      isEdit ? updateCoupon(coupon!.id, values) : createCoupon(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      toast.showSuccess(isEdit ? "کوپن ویرایش شد." : "کوپن ایجاد شد.");
      onClose();
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "ذخیره ناموفق بود.",
      ),
  });

  function toggleMultiSelect(
    e: React.ChangeEvent<HTMLSelectElement>,
    field: "categories" | "products",
  ) {
    const ids = Array.from(e.target.selectedOptions).map((o) =>
      Number(o.value),
    );
    setValue(field, ids, { shouldDirty: true });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "ویرایش کوپن" : "افزودن کوپن"}
      widthClass="max-w-xl"
    >
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-col gap-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="کد کوپن"
            htmlFor="c-code"
            required
            error={errors.code?.message}
          >
            <Input id="c-code" dir="ltr" {...register("code")} />
          </Field>
          <Field label="نوع" htmlFor="c-type" required>
            <Select id="c-type" {...register("type")}>
              <option value="percent">درصدی</option>
              <option value="fixed">مبلغ ثابت</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="مقدار"
            htmlFor="c-value"
            required
            error={errors.value?.message}
          >
            <Input id="c-value" type="number" min={1} {...register("value")} />
          </Field>
          <Field
            label="حداقل مبلغ سفارش"
            htmlFor="c-min-order"
            error={errors.minOrderValue?.message}
          >
            <Input
              id="c-min-order"
              type="number"
              min={0}
              {...register("minOrderValue")}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="سقف تخفیف (تومان)"
            htmlFor="c-max-discount"
            hint="فقط برای نوع درصدی"
            error={errors.maxDiscount?.message}
          >
            <Input
              id="c-max-discount"
              type="number"
              min={0}
              value={watch("maxDiscount") ?? ""}
              onChange={(e) =>
                setValue(
                  "maxDiscount",
                  e.target.value ? Number(e.target.value) : null,
                  { shouldDirty: true },
                )
              }
            />
          </Field>
          <Field
            label="سقف تعداد استفاده کل"
            htmlFor="c-usage-limit"
            error={errors.usageLimit?.message}
          >
            <Input
              id="c-usage-limit"
              type="number"
              min={1}
              value={watch("usageLimit") ?? ""}
              onChange={(e) =>
                setValue(
                  "usageLimit",
                  e.target.value ? Number(e.target.value) : null,
                  { shouldDirty: true },
                )
              }
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="سقف استفاده هر کاربر"
            htmlFor="c-per-user"
            error={errors.perUserLimit?.message}
          >
            <Input
              id="c-per-user"
              type="number"
              min={1}
              value={watch("perUserLimit") ?? ""}
              onChange={(e) =>
                setValue(
                  "perUserLimit",
                  e.target.value ? Number(e.target.value) : null,
                  { shouldDirty: true },
                )
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="شروع" htmlFor="c-starts">
              <Input
                id="c-starts"
                type="date"
                value={watch("startsAt") ?? ""}
                onChange={(e) =>
                  setValue("startsAt", e.target.value || null, {
                    shouldDirty: true,
                  })
                }
              />
            </Field>
            <Field label="پایان" htmlFor="c-ends">
              <Input
                id="c-ends"
                type="date"
                value={watch("endsAt") ?? ""}
                onChange={(e) =>
                  setValue("endsAt", e.target.value || null, {
                    shouldDirty: true,
                  })
                }
              />
            </Field>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="محدود به دسته‌بندی‌ها"
            htmlFor="c-categories"
            hint="اختیاری — خالی یعنی همه"
          >
            <Select
              id="c-categories"
              multiple
              className="h-28"
              value={watch("categories").map(String)}
              onChange={(e) => toggleMultiSelect(e, "categories")}
            >
              {(categories?.results ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="محدود به محصولات"
            htmlFor="c-products"
            hint="اختیاری — خالی یعنی همه"
          >
            <Select
              id="c-products"
              multiple
              className="h-28"
              value={watch("products").map(String)}
              onChange={(e) => toggleMultiSelect(e, "products")}
            >
              {(products?.results ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Switch
          checked={watch("isActive")}
          onChange={(v) => setValue("isActive", v, { shouldDirty: true })}
          label="فعال"
        />
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            انصراف
          </Button>
          <Button type="submit" disabled={isSubmitting || mutation.isPending}>
            {mutation.isPending ? "در حال ذخیره…" : "ذخیره"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
