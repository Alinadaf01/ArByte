import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { SingleImageField } from "@/components/ui/SingleImageField";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/Stateviews";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/cn";
import { useToast } from "@/lib/ToastContext";
import {
  ProductSearchSelect,
  type PickedProduct,
} from "@/components/ui/ProductSearchSelect";
import {
  createHomeShowcase,
  deleteHomeShowcase,
  listHomeShowcases,
  updateHomeShowcase,
} from "@/lib/api";
import type { HomeShowcaseData } from "@/types/homepage";
import {
  showcaseFormSchema,
  type ShowcaseFormSchema,
} from "@/lib/homepageSchema";

const EMPTY_SPEC = { label: "", value: "" };

function emptyValues(order: 1 | 2): ShowcaseFormSchema {
  return {
    order,
    product: null,
    imageAlt: "",
    title: "",
    description: "",
    specs: [],
    ctaLabel: "جزئیات را ببینید",
    ctaUrl: "",
    theme: order === 1 ? "light" : "dark",
    isActive: true,
  };
}

function toFormValues(showcase: HomeShowcaseData): ShowcaseFormSchema {
  return {
    order: showcase.order as 1 | 2,
    product: showcase.product,
    imageAlt: showcase.imageAlt,
    title: showcase.title,
    description: showcase.description,
    specs: showcase.specs,
    ctaLabel: showcase.ctaLabel,
    ctaUrl: showcase.ctaUrl,
    theme: showcase.theme,
    isActive: showcase.isActive,
  };
}

function ShowcaseSlot({
  order,
  existing,
}: {
  order: 1 | 2;
  existing: HomeShowcaseData | null;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pickedProduct, setPickedProduct] = useState<PickedProduct | null>(
    existing?.productDetail
      ? {
          id: existing.productDetail.id,
          name: existing.productDetail.name,
          sku: existing.productDetail.sku,
          slug: existing.productDetail.slug,
          thumbnail: existing.productDetail.thumbnail,
        }
      : null,
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const initialProductId = existing?.product ?? null;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ShowcaseFormSchema>({
    resolver: zodResolver(showcaseFormSchema),
    defaultValues: existing ? toFormValues(existing) : emptyValues(order),
  });

  useEffect(() => {
    if (existing) {
      reset(toFormValues(existing));
      setPickedProduct(
        existing.productDetail
          ? {
              id: existing.productDetail.id,
              name: existing.productDetail.name,
              sku: existing.productDetail.sku,
              slug: existing.productDetail.slug,
              thumbnail: existing.productDetail.thumbnail,
            }
          : null,
      );
    } else {
      reset(emptyValues(order));
      setPickedProduct(null);
    }
    setImageFile(null);
    setImagePreview(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id]);

  const specs = watch("specs");

  function addSpec() {
    setValue("specs", [...specs, EMPTY_SPEC], { shouldDirty: true });
  }
  function removeSpec(index: number) {
    setValue(
      "specs",
      specs.filter((_, i) => i !== index),
      { shouldDirty: true },
    );
  }
  function updateSpec(index: number, key: "label" | "value", value: string) {
    setValue(
      "specs",
      specs.map((s, i) => (i === index ? { ...s, [key]: value } : s)),
      { shouldDirty: true },
    );
  }

  const saveMutation = useMutation({
    mutationFn: async (values: ShowcaseFormSchema) => {
      if (existing) return updateHomeShowcase(existing.id, values, imageFile);
      return createHomeShowcase(values, imageFile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-showcases"] });
      setImageFile(null);
      setImagePreview(null);
      toast.showSuccess("بلوک نمایش ذخیره شد.");
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "ذخیره ناموفق بود.",
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteHomeShowcase(existing!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-showcases"] });
      setConfirmDelete(false);
      toast.showSuccess("بلوک نمایش حذف شد.");
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "حذف ناموفق بود.",
      ),
  });

  const hasPendingImage = Boolean(imageFile);
  // ProductSearchSelect keeps `pickedProduct` in its own useState, outside
  // react-hook-form -- so picking/clearing a product alone never set
  // isDirty, and the Save button stayed disabled with no way to submit
  // that change. Compared against the id the slot loaded with instead.
  const productChanged = (pickedProduct?.id ?? null) !== initialProductId;
  const theme = watch("theme");
  const isDark = theme === "dark";

  return (
    <form
      onSubmit={handleSubmit(
        (values) =>
          saveMutation.mutate({
            ...values,
            product: pickedProduct?.id ?? null,
          }),
        // Zod blocking submission previously failed completely silently --
        // clicking Save just did nothing, confirmed live. Now surfaces a
        // toast either way; if it's the specs array specifically (the most
        // common real case: an added row left with an empty label/value)
        // the message says so, otherwise a generic prompt to check the form
        // rather than guessing wrong at which field actually failed.
        (errs) => {
          const message = errs.specs
            ? "چند فیلد مشخصات ناقص است. عنوان و مقدار هر مشخصه را کامل کنید."
            : "چند فیلد فرم نامعتبر است. مقادیر را بررسی کنید.";
          toast.showError(message);
        },
      )}
      className={cn(
        "glass-card flex flex-col gap-4 p-6",
        isDark && "!bg-ink-950/80",
      )}
    >
      <div className="flex items-center justify-between">
        <h2 className="m-0 text-sm font-bold text-white">
          بلوک {order === 1 ? "اول" : "دوم"}
        </h2>
        {existing && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:border-danger/40 hover:text-danger"
          >
            حذف بلوک
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <SingleImageField
          label="تصویر"
          currentUrl={imagePreview ?? existing?.image ?? null}
          onFileSelected={(file) => {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
          }}
        />
        <p className="m-0 text-[11px] text-slate-500">
          ابعاد پیشنهادی: ۱۶۰۰×۱۶۰۰ (مربع)
        </p>
      </div>

      <Field label="متن جایگزین تصویر" error={errors.imageAlt?.message}>
        <Input {...register("imageAlt")} />
      </Field>

      <Field
        label="محصول مرتبط (اختیاری)"
        hint="می‌تواند به یک دسته‌بندی یا کمپین هم اشاره کند، نه لزوماً یک محصول."
      >
        <ProductSearchSelect
          value={pickedProduct}
          onChange={setPickedProduct}
        />
      </Field>

      <Field
        label="عنوان"
        hint="در صورت خالی بودن، نام محصول لینک‌شده استفاده می‌شود."
        error={errors.title?.message}
      >
        <Input {...register("title")} placeholder={pickedProduct?.name ?? ""} />
      </Field>

      <Field label="توضیحات" error={errors.description?.message}>
        <Textarea {...register("description")} />
      </Field>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300">
            مشخصات (مونو)
          </span>
          <Button type="button" size="sm" variant="secondary" onClick={addSpec}>
            + افزودن مشخصه
          </Button>
        </div>
        {specs.length === 0 ? (
          <p className="m-0 text-xs text-slate-500">مشخصه‌ای ثبت نشده.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {specs.map((spec, index) => {
              const labelError = errors.specs?.[index]?.label?.message;
              const valueError = errors.specs?.[index]?.value?.message;
              return (
                <div key={index} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="عنوان (مثلاً وزن)"
                      value={spec.label}
                      onChange={(e) =>
                        updateSpec(index, "label", e.target.value)
                      }
                    />
                    <Input
                      placeholder="مقدار (مثلاً ۲۵۰ گرم)"
                      dir="ltr"
                      value={spec.value}
                      onChange={(e) =>
                        updateSpec(index, "value", e.target.value)
                      }
                    />
                    <button
                      type="button"
                      onClick={() => removeSpec(index)}
                      aria-label="حذف مشخصه"
                      className="icon-btn !h-10 !w-10 shrink-0 hover:!text-danger"
                    >
                      <svg
                        className="size-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.8"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  {(labelError || valueError) && (
                    <p className="m-0 text-[11px] text-danger">
                      {labelError || valueError}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="متن دکمه" error={errors.ctaLabel?.message}>
          <Input {...register("ctaLabel")} />
        </Field>
        <Field
          label="لینک دکمه"
          hint="در صورت خالی بودن و انتخاب محصول، به‌صورت خودکار تنظیم می‌شود."
          error={errors.ctaUrl?.message}
        >
          <Input dir="ltr" {...register("ctaUrl")} />
        </Field>
      </div>

      <Field label="تم">
        <Select
          value={theme}
          onChange={(e) =>
            setValue("theme", e.target.value as "light" | "dark", {
              shouldDirty: true,
            })
          }
        >
          <option value="light">روشن</option>
          <option value="dark">تیره</option>
        </Select>
      </Field>

      <Switch
        checked={watch("isActive")}
        onChange={(v) => setValue("isActive", v, { shouldDirty: true })}
        label="نمایش این بلوک در صفحه اصلی"
      />

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={
            isSubmitting || (!isDirty && !hasPendingImage && !productChanged)
          }
        >
          {isSubmitting
            ? "در حال ذخیره…"
            : existing
              ? "ذخیره بلوک"
              : "ایجاد بلوک"}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="حذف بلوک نمایش"
        description="این بلوک از صفحه اصلی حذف می‌شود. این عملیات قابل بازگشت نیست."
        confirmLabel="حذف"
        pending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />
    </form>
  );
}

export function ShowcasesTab() {
  const {
    data: showcases,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["homepage-showcases"],
    queryFn: listHomeShowcases,
  });

  if (isError)
    return (
      <ErrorState
        description="دریافت بلوک‌های نمایش ناموفق بود."
        onRetry={() => refetch()}
      />
    );
  if (isPending || !showcases) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const slot1 = showcases.find((s) => s.order === 1) ?? null;
  const slot2 = showcases.find((s) => s.order === 2) ?? null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ShowcaseSlot key={slot1?.id ?? "new-1"} order={1} existing={slot1} />
      <ShowcaseSlot key={slot2?.id ?? "new-2"} order={2} existing={slot2} />
    </div>
  );
}
