import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/Stateviews";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ImagesCard } from "@/pages/products/ImagesCard";
import { SpecsCard } from "@/pages/products/SpecsCard";
import { VariantEditor } from "@/pages/products/VariantEditor";
import {
  deleteProduct,
  getProduct,
  listBrands,
  listCategories,
  saveProduct,
} from "@/lib/catalogApi";
import { useToast } from "@/lib/ToastContext";
import {
  CONDITION_LABELS,
  GRADE_OPTIONS,
  type AdminProduct,
  type ProductFormValues,
  type ProductSeo,
} from "@/types/catalog";

const STOREFRONT_URL = (
  (import.meta.env.VITE_STOREFRONT_URL as string | undefined) ||
  "http://localhost:3000"
).replace(/\/+$/, "");

const EMPTY_SEO: ProductSeo = {
  metaTitle: null,
  metaDescription: null,
  canonical: null,
  robots: null,
  ogTitle: null,
  ogDescription: null,
  ogImage: null,
};

function toForm(p: AdminProduct | null): ProductFormValues {
  return {
    name: p?.name ?? "",
    slug: p?.slug ?? "",
    brand: p?.brand ?? "",
    category: p?.category ?? "",
    condition: p?.condition ?? "NEW",
    grade: p?.grade ?? null,
    status: p?.status ?? "ACTIVE",
    isVisibleOnSite: p?.isVisibleOnSite ?? true,
    isVisibleInSearch: p?.isVisibleInSearch ?? true,
    isVisibleInCategory: p?.isVisibleInCategory ?? true,
    priority: p?.priority ?? 0,
    shortDescription: p?.shortDescription ?? "",
    description: p?.description ?? "",
    modelNumber: p?.modelNumber ?? "",
    gtin: p?.gtin ?? "",
    partNumber: p?.partNumber ?? "",
    warrantyMonths: p?.warrantyMonths ?? null,
    warrantyProvider: p?.warrantyProvider ?? "",
    requiresSerial: p?.requiresSerial ?? true,
    shippingNote: p?.shippingNote ?? "",
    returnPolicyNote: p?.returnPolicyNote ?? "",
    seo: { ...EMPTY_SEO, ...(p?.seo ?? {}) },
  };
}

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const product = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id!),
    enabled: !isNew,
  });
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(),
  });
  const { data: brands } = useQuery({
    queryKey: ["brands"],
    queryFn: () => listBrands(),
  });
  const [form, setForm] = useState<ProductFormValues>(toForm(null));
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (product.data) setForm(toForm(product.data));
  }, [product.data]);

  const set = <K extends keyof ProductFormValues>(
    key: K,
    value: ProductFormValues[K],
  ) => setForm((f) => ({ ...f, [key]: value }));
  const setSeo = <K extends keyof ProductSeo>(key: K, value: string) =>
    setForm((f) => ({ ...f, seo: { ...f.seo, [key]: value || null } }));

  const save = useMutation({
    mutationFn: () => saveProduct(isNew ? null : id!, form),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.setQueryData(["product", saved.id], saved);
      toast.showSuccess(
        isNew
          ? "محصول ساخته شد؛ حالا تصاویر و واریانت‌ها را اضافه کنید."
          : "محصول ذخیره شد.",
      );
      if (isNew) navigate(`/products/${saved.id}`, { replace: true });
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "ذخیره ناموفق بود.",
      ),
  });
  const remove = useMutation({
    mutationFn: () => deleteProduct(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.showSuccess("محصول حذف شد.");
      navigate("/products");
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "حذف ناموفق بود.",
      ),
  });

  if (!isNew && product.isError)
    return (
      <ErrorState
        description="دریافت محصول ناموفق بود."
        onRetry={() => product.refetch()}
      />
    );
  if (!isNew && product.isPending) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={isNew ? "محصول جدید" : form.name || "ویرایش محصول"}
        description={
          isNew
            ? "اول اطلاعات پایه را ذخیره کنید؛ بعد تصاویر، مشخصات و واریانت‌ها باز می‌شوند."
            : "اطلاعات، تصاویر، مشخصات و واریانت‌های محصول."
        }
        actions={
          !isNew && product.data ? (
            <>
              <a
                href={`${STOREFRONT_URL}${product.data.storefrontUrl}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-300 hover:text-brand-200"
              >
                <ExternalLink className="size-4" /> مشاهده در سایت
              </a>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmDelete(true)}
              >
                حذف محصول
              </Button>
            </>
          ) : null
        }
      />

      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <section className="glass-card flex flex-col gap-4 p-6">
          <h2 className="m-0 text-sm font-bold text-white">اطلاعات پایه</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="نام محصول" htmlFor="p-name">
              <Input
                id="p-name"
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </Field>
            <Field label="slug (لاتین، در آدرس صفحه)" htmlFor="p-slug">
              <Input
                id="p-slug"
                dir="ltr"
                required
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
              />
            </Field>
            <Field label="برند" htmlFor="p-brand">
              <Select
                id="p-brand"
                required
                value={form.brand}
                onChange={(e) => set("brand", e.target.value)}
              >
                <option value="">انتخاب برند</option>
                {brands?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="دسته"
              htmlFor="p-category"
              hint="مشخصات و محورهای واریانت از دسته می‌آیند."
            >
              <Select
                id="p-category"
                required
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
              >
                <option value="">انتخاب دسته</option>
                {categories?.results.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="وضعیت کالا" htmlFor="p-condition">
              <Select
                id="p-condition"
                value={form.condition}
                onChange={(e) =>
                  set(
                    "condition",
                    e.target.value as ProductFormValues["condition"],
                  )
                }
              >
                {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="گرید" htmlFor="p-grade">
              <Select
                id="p-grade"
                value={form.grade ?? ""}
                onChange={(e) =>
                  set(
                    "grade",
                    (e.target.value || null) as ProductFormValues["grade"],
                  )
                }
              >
                <option value="">بدون گرید</option>
                {GRADE_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="وضعیت" htmlFor="p-status">
              <Select
                id="p-status"
                value={form.status}
                onChange={(e) =>
                  set("status", e.target.value as ProductFormValues["status"])
                }
              >
                <option value="ACTIVE">فعال</option>
                <option value="INACTIVE">غیرفعال</option>
              </Select>
            </Field>
            <Field
              label="اولویت نمایش"
              htmlFor="p-priority"
              hint="عدد بزرگ‌تر بالاتر نمایش داده می‌شود."
            >
              <Input
                id="p-priority"
                type="number"
                value={form.priority}
                onChange={(e) => set("priority", Number(e.target.value))}
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-6">
            <Switch
              checked={form.isVisibleOnSite}
              onChange={(v) => set("isVisibleOnSite", v)}
              label="نمایش در سایت"
            />
            <Switch
              checked={form.isVisibleInSearch}
              onChange={(v) => set("isVisibleInSearch", v)}
              label="نمایش در جستجو"
            />
            <Switch
              checked={form.isVisibleInCategory}
              onChange={(v) => set("isVisibleInCategory", v)}
              label="نمایش در دسته"
            />
          </div>
          <Field label="توضیح کوتاه" htmlFor="p-short" hint="حداکثر ۱۶۰ نویسه.">
            <Input
              id="p-short"
              maxLength={160}
              value={form.shortDescription ?? ""}
              onChange={(e) => set("shortDescription", e.target.value)}
            />
          </Field>
          <Field label="توضیح کامل" htmlFor="p-desc">
            <Textarea
              id="p-desc"
              rows={6}
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
        </section>

        <section className="glass-card flex flex-col gap-4 p-6">
          <h2 className="m-0 text-sm font-bold text-white">
            شناسه‌ها، گارانتی و ارسال
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="مدل" htmlFor="p-model">
              <Input
                id="p-model"
                dir="ltr"
                value={form.modelNumber ?? ""}
                onChange={(e) => set("modelNumber", e.target.value)}
              />
            </Field>
            <Field label="GTIN" htmlFor="p-gtin">
              <Input
                id="p-gtin"
                dir="ltr"
                value={form.gtin ?? ""}
                onChange={(e) => set("gtin", e.target.value)}
              />
            </Field>
            <Field label="پارت‌نامبر" htmlFor="p-part">
              <Input
                id="p-part"
                dir="ltr"
                value={form.partNumber ?? ""}
                onChange={(e) => set("partNumber", e.target.value)}
              />
            </Field>
            <Field
              label="گارانتی (ماه)"
              htmlFor="p-warranty"
              hint="خالی = بدون گارانتی جدا"
            >
              <Input
                id="p-warranty"
                type="number"
                min={0}
                value={form.warrantyMonths ?? ""}
                onChange={(e) =>
                  set(
                    "warrantyMonths",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              />
            </Field>
            <Field label="ارائه‌دهنده‌ی گارانتی" htmlFor="p-wprov">
              <Input
                id="p-wprov"
                value={form.warrantyProvider ?? ""}
                onChange={(e) => set("warrantyProvider", e.target.value)}
              />
            </Field>
            <div className="flex items-end pb-2">
              <Switch
                checked={form.requiresSerial}
                onChange={(v) => set("requiresSerial", v)}
                label="سریال‌دار (ثبت سریال قبل از ارسال)"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="یادداشت ارسال" htmlFor="p-ship">
              <Textarea
                id="p-ship"
                value={form.shippingNote ?? ""}
                onChange={(e) => set("shippingNote", e.target.value)}
              />
            </Field>
            <Field label="یادداشت مرجوعی" htmlFor="p-return">
              <Textarea
                id="p-return"
                value={form.returnPolicyNote ?? ""}
                onChange={(e) => set("returnPolicyNote", e.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="glass-card flex flex-col gap-4 p-6">
          <h2 className="m-0 text-sm font-bold text-white">سئو</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="عنوان متا" htmlFor="s-title" hint="خالی = نام محصول">
              <Input
                id="s-title"
                value={form.seo.metaTitle ?? ""}
                onChange={(e) => setSeo("metaTitle", e.target.value)}
              />
            </Field>
            <Field label="آدرس canonical" htmlFor="s-canonical">
              <Input
                id="s-canonical"
                dir="ltr"
                value={form.seo.canonical ?? ""}
                onChange={(e) => setSeo("canonical", e.target.value)}
              />
            </Field>
          </div>
          <Field label="توضیح متا" htmlFor="s-desc">
            <Textarea
              id="s-desc"
              rows={2}
              maxLength={320}
              value={form.seo.metaDescription ?? ""}
              onChange={(e) => setSeo("metaDescription", e.target.value)}
            />
          </Field>
        </section>

        <div className="flex justify-end">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending
              ? "در حال ذخیره…"
              : isNew
                ? "ساخت محصول"
                : "ذخیره‌ی اطلاعات"}
          </Button>
        </div>
      </form>

      {!isNew && product.data && (
        <>
          <ImagesCard product={product.data} />
          <SpecsCard
            productId={product.data.id}
            categoryId={product.data.category}
          />
          <VariantEditor
            productId={product.data.id}
            productSlug={product.data.slug}
            categoryId={product.data.category}
          />
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="حذف محصول"
        description="محصول و واریانت‌هایش از فروشگاه برداشته می‌شوند (حذف نرم؛ سفارش‌های قبلی دست نمی‌خورند)."
        confirmLabel="حذف"
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
