import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Switch } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { createAttribute, updateAttribute, ApiFieldError } from "@/lib/api";
import {
  attributeFormSchema,
  INPUT_TYPE_LABELS,
  type AttributeFormSchemaValues,
} from "@/lib/attributeSchema";
import { useToast } from "@/lib/ToastContext";
import type { Attribute } from "@/types/attribute";
import type { AdminCategory } from "@/types/category";

export function AttributeFormModal({
  open,
  onClose,
  attribute,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  attribute: Attribute | null;
  categories: AdminCategory[];
}) {
  const isEdit = !!attribute;
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
  } = useForm<AttributeFormSchemaValues>({
    resolver: zodResolver(attributeFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      unit: "",
      inputType: "select",
      categories: [],
      isRequired: false,
      order: 0,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      attribute
        ? {
            name: attribute.name,
            slug: attribute.slug,
            unit: attribute.unit,
            inputType: attribute.inputType,
            categories: attribute.categories,
            isRequired: attribute.isRequired,
            order: attribute.order,
          }
        : {
            name: "",
            slug: "",
            unit: "",
            inputType: "select",
            categories: [],
            isRequired: false,
            order: 0,
          },
    );
  }, [open, attribute, reset]);

  const mutation = useMutation({
    mutationFn: async (values: AttributeFormSchemaValues) =>
      isEdit ? updateAttribute(attribute!.id, values) : createAttribute(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attributes"] });
      toast.showSuccess(isEdit ? "مشخصه ویرایش شد." : "مشخصه ایجاد شد.");
      onClose();
    },
    onError: (error: unknown) => {
      if (error instanceof ApiFieldError && error.field !== "detail") {
        setError(error.field as keyof AttributeFormSchemaValues, {
          message: error.message,
        });
      } else {
        toast.showError(
          error instanceof Error ? error.message : "ذخیره ناموفق بود.",
        );
      }
    },
  });

  const selectedCategories = watch("categories");

  function toggleCategory(id: number) {
    const next = selectedCategories.includes(id)
      ? selectedCategories.filter((c) => c !== id)
      : [...selectedCategories, id];
    setValue("categories", next, { shouldDirty: true, shouldValidate: true });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "ویرایش مشخصه" : "مشخصه جدید"}
    >
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-col gap-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="نام"
            htmlFor="attr-name"
            required
            error={errors.name?.message}
          >
            <Input id="attr-name" {...register("name")} />
          </Field>
          <Field
            label="اسلاگ"
            htmlFor="attr-slug"
            required
            error={errors.slug?.message}
            hint="مثال: max-load"
          >
            <Input id="attr-slug" dir="ltr" {...register("slug")} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="نوع ورودی"
            htmlFor="attr-type"
            required
            error={errors.inputType?.message}
          >
            <Select id="attr-type" {...register("inputType")}>
              {Object.entries(INPUT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="واحد"
            htmlFor="attr-unit"
            error={errors.unit?.message}
            hint="مثال: کیلوگرم، سانتی‌متر (اختیاری)"
          >
            <Input id="attr-unit" {...register("unit")} />
          </Field>
        </div>

        <Field label="دسته‌بندی‌ها" error={errors.categories?.message} required>
          <div className="flex flex-wrap gap-2 rounded-xl border border-white/[0.06] bg-ink-800/40 p-3">
            {categories.length === 0 && (
              <p className="text-xs text-slate-500">
                ابتدا یک دسته‌بندی ایجاد کنید.
              </p>
            )}
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(Number(cat.id))}
                className={
                  selectedCategories.includes(Number(cat.id))
                    ? "chip bg-brand-500/15 text-brand-300"
                    : "chip bg-white/[0.04] text-slate-400 hover:text-slate-200"
                }
              >
                {cat.name}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="ترتیب نمایش"
            htmlFor="attr-order"
            error={errors.order?.message}
          >
            <Input id="attr-order" type="number" {...register("order")} />
          </Field>
          <div className="flex items-end pb-2.5">
            <Switch
              checked={watch("isRequired")}
              onChange={(v) => setValue("isRequired", v, { shouldDirty: true })}
              label="الزامی"
            />
          </div>
        </div>

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
