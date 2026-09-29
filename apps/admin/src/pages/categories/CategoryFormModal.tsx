import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Textarea, Select, Switch } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { createCategory, updateCategory, ApiFieldError } from "@/lib/api";
import {
  categoryFormSchema,
  type CategoryFormSchemaValues,
} from "@/lib/categorySchema";
import { useToast } from "@/lib/ToastContext";
import type { AdminCategory } from "@/types/category";

export function CategoryFormModal({
  open,
  onClose,
  category,
  parentOptions,
}: {
  open: boolean;
  onClose: () => void;
  category: AdminCategory | null;
  parentOptions: AdminCategory[];
}) {
  const isEdit = !!category;
  const queryClient = useQueryClient();
  const toast = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CategoryFormSchemaValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      slug: "",
      name: "",
      description: "",
      parent: null,
      order: 0,
      isActive: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      category
        ? {
            slug: category.slug,
            name: category.name,
            description: category.description,
            parent: category.parent,
            order: category.order,
            isActive: category.isActive,
          }
        : {
            slug: "",
            name: "",
            description: "",
            parent: null,
            order: 0,
            isActive: true,
          },
    );
    setImageFile(null);
    setImagePreview(category?.image ?? null);
  }, [open, category, reset]);

  const mutation = useMutation({
    mutationFn: async (values: CategoryFormSchemaValues) =>
      isEdit
        ? updateCategory(category!.id, values, imageFile)
        : createCategory(values, imageFile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.showSuccess(
        isEdit ? "دسته‌بندی ویرایش شد." : "دسته‌بندی ایجاد شد.",
      );
      onClose();
    },
    onError: (error: unknown) => {
      if (error instanceof ApiFieldError && error.field !== "detail") {
        setError(error.field as keyof CategoryFormSchemaValues, {
          message: error.message,
        });
      } else {
        toast.showError(
          error instanceof Error ? error.message : "ذخیره ناموفق بود.",
        );
      }
    },
  });

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  const parentValue = watch("parent");
  const eligibleParents = parentOptions.filter(
    (c) => c.parent === null && c.id !== category?.id,
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "ویرایش دسته‌بندی" : "دسته‌بندی جدید"}
    >
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-col gap-4"
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-white/15 bg-ink-800/60 text-slate-500 transition-colors hover:border-brand-500/40 hover:text-brand-300"
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <svg
                className="size-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.8"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 8.25V18a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18V8.25m-18 0V6a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 6v2.25m-18 0h18"
                />
              </svg>
            )}
          </button>
          <div className="flex-1 text-xs text-slate-500">
            تصویر دسته‌بندی (اختیاری). برای بهترین نتیجه از تصویر مربعی استفاده
            کنید.
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="نام"
            htmlFor="cat-name"
            required
            error={errors.name?.message}
          >
            <Input id="cat-name" {...register("name")} />
          </Field>
          <Field
            label="اسلاگ"
            htmlFor="cat-slug"
            required
            error={errors.slug?.message}
            hint="مثال: desktop-stands"
          >
            <Input id="cat-slug" dir="ltr" {...register("slug")} />
          </Field>
        </div>

        <Field
          label="توضیحات"
          htmlFor="cat-desc"
          error={errors.description?.message}
        >
          <Textarea id="cat-desc" {...register("description")} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="دسته والد"
            htmlFor="cat-parent"
            error={errors.parent?.message}
            hint="حداکثر دو سطح دسته‌بندی مجاز است."
          >
            <Select
              id="cat-parent"
              value={parentValue ?? ""}
              onChange={(e) =>
                setValue(
                  "parent",
                  e.target.value ? Number(e.target.value) : null,
                  { shouldDirty: true },
                )
              }
            >
              <option value="">بدون والد (سطح اول)</option>
              {eligibleParents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="ترتیب نمایش"
            htmlFor="cat-order"
            error={errors.order?.message}
          >
            <Input id="cat-order" type="number" {...register("order")} />
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
          <Button
            type="submit"
            disabled={isSubmitting || (!isDirty && !imageFile)}
          >
            {isSubmitting ? "در حال ذخیره…" : "ذخیره"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
