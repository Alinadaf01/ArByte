import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { Field, Input, Textarea, Select, Switch } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState } from "@/components/ui/Stateviews";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProductImagesSection } from "@/pages/products/ProductImagesSection";
import { ProductColorsSection } from "@/pages/products/ProductColorsSection";
import { ProductSpecsSection } from "@/pages/products/ProductSpecsSection";
import {
  getProduct,
  createProduct,
  updateProduct,
  listCategories,
  ApiFieldError,
} from "@/lib/api";
import {
  productFormSchema,
  PRODUCTION_STATUS_LABELS,
  type ProductFormSchemaValues,
} from "@/lib/productSchema";
import { useUnsavedChangesGuard } from "@/lib/useUnsavedChangesGuard";
import { useToast } from "@/lib/ToastContext";

const EMPTY_VALUES: ProductFormSchemaValues = {
  sku: "",
  slug: "",
  name: "",
  shortDescription: "",
  description: "",
  price: 0,
  costPrice: null,
  category: null,
  material: "",
  dimensions: { w: 0, h: 0, d: 0 },
  weight: 0,
  order: 0,
  isActive: true,
  shippingTime: "",
  warrantyTerms: "",
  productionStatus: "in_stock",
  metaTitle: "",
  metaDescription: "",
};

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id && id !== "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const {
    data: product,
    isPending: productPending,
    isError: productError,
  } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id!),
    enabled: isEdit,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories({ pageSize: 100 }),
  });
  const categoryList = useMemo(() => categories?.results ?? [], [categories]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProductFormSchemaValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (!product) return;
    reset({
      sku: product.sku,
      slug: product.slug,
      name: product.name,
      shortDescription: product.shortDescription,
      description: product.description,
      price: product.price,
      costPrice: product.costPrice,
      category: product.category,
      material: product.material,
      dimensions: product.dimensions,
      weight: product.weight,
      order: product.order,
      isActive: product.isActive,
      shippingTime: product.shippingTime,
      warrantyTerms: product.warrantyTerms,
      productionStatus: product.productionStatus,
      metaTitle: product.metaTitle,
      metaDescription: product.metaDescription,
    });
  }, [product, reset]);

  const mutation = useMutation({
    mutationFn: async (values: ProductFormSchemaValues) =>
      isEdit ? updateProduct(id!, values) : createProduct(values),
    onSuccess: (saved, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", saved.id] });
      // Clear the dirty flag using the just-submitted values *before*
      // navigating — otherwise the unsaved-changes blocker below sees
      // isDirty still true and intercepts this very navigation.
      reset(variables);
      toast.showSuccess(
        isEdit
          ? "محصول ذخیره شد."
          : "محصول ایجاد شد — اکنون می‌توانید تصویر، رنگ و مشخصات اضافه کنید.",
      );
      if (!isEdit) navigate(`/products/${saved.id}`, { replace: true });
    },
    onError: (error: unknown) => {
      if (error instanceof ApiFieldError && error.field !== "detail") {
        setError(error.field as keyof ProductFormSchemaValues, {
          message: error.message,
        });
      } else {
        toast.showError(
          error instanceof Error ? error.message : "ذخیره ناموفق بود.",
        );
      }
    },
  });

  const blocker = useUnsavedChangesGuard(isDirty && !isSubmitting);

  if (isEdit && productError) {
    return <ErrorState description="دریافت محصول ناموفق بود." />;
  }

  if (isEdit && productPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const categoryValue = watch("category");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={isEdit ? `ویرایش «${product?.name ?? ""}»` : "افزودن محصول"}
        description="اطلاعات پایه، تصاویر، رنگ‌ها و مشخصات فنی محصول."
      />

      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-col gap-6"
      >
        <section className="glass-card flex flex-col gap-4 p-6">
          <h2 className="m-0 text-sm font-bold text-white">اطلاعات پایه</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="نام محصول"
              htmlFor="p-name"
              required
              error={errors.name?.message}
            >
              <Input id="p-name" {...register("name")} />
            </Field>
            <Field
              label="اسلاگ"
              htmlFor="p-slug"
              required
              error={errors.slug?.message}
            >
              <Input id="p-slug" dir="ltr" {...register("slug")} />
            </Field>
            <Field
              label="کد کالا (SKU)"
              htmlFor="p-sku"
              required
              error={errors.sku?.message}
            >
              <Input id="p-sku" dir="ltr" {...register("sku")} />
            </Field>
            <Field
              label="دسته‌بندی"
              htmlFor="p-category"
              required
              error={errors.category?.message}
            >
              <Select
                id="p-category"
                value={categoryValue ?? ""}
                onChange={(e) =>
                  setValue(
                    "category",
                    e.target.value ? Number(e.target.value) : null,
                    { shouldDirty: true },
                  )
                }
              >
                <option value="">— انتخاب کنید —</option>
                {categoryList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            label="توضیح کوتاه"
            htmlFor="p-short-desc"
            error={errors.shortDescription?.message}
            hint="حداکثر ۱۶۰ کاراکتر — در باکس کارت محصول جا می‌شود."
          >
            <Input
              id="p-short-desc"
              maxLength={160}
              {...register("shortDescription")}
            />
          </Field>
          <Field
            label="توضیحات کامل"
            htmlFor="p-desc"
            error={errors.description?.message}
          >
            <Textarea id="p-desc" {...register("description")} />
          </Field>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field
              label="قیمت (تومان)"
              htmlFor="p-price"
              required
              error={errors.price?.message}
            >
              <Input id="p-price" type="number" {...register("price")} />
            </Field>
            <Field
              label="قیمت تمام‌شده"
              htmlFor="p-cost"
              error={errors.costPrice?.message}
              hint="اختیاری"
            >
              <Input
                id="p-cost"
                type="number"
                {...register("costPrice", {
                  setValueAs: (v) => (v === "" ? null : Number(v)),
                })}
              />
            </Field>
            <Field
              label="اولویت نمایش"
              htmlFor="p-order"
              error={errors.order?.message}
            >
              <Input id="p-order" type="number" {...register("order")} />
            </Field>
            <Field
              label="وضعیت تولید"
              htmlFor="p-production"
              error={errors.productionStatus?.message}
            >
              <Select id="p-production" {...register("productionStatus")}>
                {Object.entries(PRODUCTION_STATUS_LABELS).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field
              label="عرض (mm)"
              htmlFor="p-w"
              error={errors.dimensions?.w?.message}
            >
              <Input id="p-w" type="number" {...register("dimensions.w")} />
            </Field>
            <Field
              label="ارتفاع (mm)"
              htmlFor="p-h"
              error={errors.dimensions?.h?.message}
            >
              <Input id="p-h" type="number" {...register("dimensions.h")} />
            </Field>
            <Field
              label="عمق (mm)"
              htmlFor="p-d"
              error={errors.dimensions?.d?.message}
            >
              <Input id="p-d" type="number" {...register("dimensions.d")} />
            </Field>
            <Field
              label="وزن (گرم)"
              htmlFor="p-weight"
              error={errors.weight?.message}
            >
              <Input id="p-weight" type="number" {...register("weight")} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="متریال"
              htmlFor="p-material"
              error={errors.material?.message}
            >
              <Input id="p-material" {...register("material")} />
            </Field>
            <Field
              label="زمان ارسال"
              htmlFor="p-shipping"
              error={errors.shippingTime?.message}
              hint="مثال: ۳ تا ۵ روز کاری"
            >
              <Input id="p-shipping" {...register("shippingTime")} />
            </Field>
          </div>

          <Field
            label="شرایط گارانتی"
            htmlFor="p-warranty"
            error={errors.warrantyTerms?.message}
            hint='مثلاً "۶ ماه گارانتی تعویض در صورت نقص ساخت."'
          >
            <Textarea id="p-warranty" {...register("warrantyTerms")} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="عنوان متا (SEO)"
              htmlFor="p-meta-title"
              error={errors.metaTitle?.message}
            >
              <Input id="p-meta-title" {...register("metaTitle")} />
            </Field>
            <Field
              label="توضیح متا (SEO)"
              htmlFor="p-meta-desc"
              error={errors.metaDescription?.message}
            >
              <Input id="p-meta-desc" {...register("metaDescription")} />
            </Field>
          </div>

          <Switch
            checked={watch("isActive")}
            onChange={(v) => setValue("isActive", v, { shouldDirty: true })}
            label="فعال"
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "در حال ذخیره…"
                : isEdit
                  ? "ذخیره تغییرات"
                  : "ذخیره و ادامه"}
            </Button>
          </div>
        </section>

        {!isEdit && (
          <section className="glass-card flex flex-col items-center gap-2 p-10 text-center">
            <p className="m-0 text-sm text-slate-400">
              برای افزودن تصویر، رنگ و مشخصات، ابتدا اطلاعات پایه را ذخیره کنید.
            </p>
          </section>
        )}
      </form>

      {isEdit && product && (
        <>
          <ProductImagesSection
            productId={product.id}
            images={product.images}
          />
          <ProductColorsSection
            productId={product.id}
            colors={product.colors}
          />
          <ProductSpecsSection
            productId={product.id}
            categoryId={product.category}
          />
        </>
      )}

      <ConfirmDialog
        open={blocker.state === "blocked"}
        title="تغییرات ذخیره‌نشده"
        description="اگر خارج شوید، تغییرات اطلاعات پایه ذخیره نخواهد شد."
        confirmLabel="خروج بدون ذخیره"
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </div>
  );
}
