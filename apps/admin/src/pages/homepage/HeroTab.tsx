import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Field, Input, Switch } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { SingleImageField } from "@/components/ui/SingleImageField";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/Stateviews";
import { getHeroSection, updateHeroSection } from "@/lib/api";
import { heroFormSchema, type HeroFormSchema } from "@/lib/homepageSchema";
import { useUnsavedChangesGuard } from "@/lib/useUnsavedChangesGuard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/lib/ToastContext";

type ImageKey = "image" | "imageMobile";

export function HeroTab() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [imageFiles, setImageFiles] = useState<Partial<Record<ImageKey, File>>>(
    {},
  );
  const [previews, setPreviews] = useState<Partial<Record<ImageKey, string>>>(
    {},
  );

  const {
    data: hero,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["homepage-hero"],
    queryFn: getHeroSection,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<HeroFormSchema>({
    resolver: zodResolver(heroFormSchema),
    defaultValues: {
      imageAlt: "",
      title: "",
      subtitle: "",
      caption: "",
      ctaLabel: "",
      ctaUrl: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (!hero) return;
    reset({
      imageAlt: hero.imageAlt,
      title: hero.title,
      subtitle: hero.subtitle,
      caption: hero.caption,
      ctaLabel: hero.ctaLabel,
      ctaUrl: hero.ctaUrl,
      isActive: hero.isActive,
    });
    setImageFiles({});
    setPreviews({});
  }, [hero, reset]);

  const mutation = useMutation({
    mutationFn: (values: HeroFormSchema) =>
      updateHeroSection(values, imageFiles),
    onSuccess: (saved, variables) => {
      queryClient.setQueryData(["homepage-hero"], saved);
      reset(variables);
      setImageFiles({});
      setPreviews({});
      toast.showSuccess("هیرو ذخیره شد.");
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "ذخیره ناموفق بود.",
      ),
  });

  const hasPendingImages = Object.keys(imageFiles).length > 0;
  const blocker = useUnsavedChangesGuard(
    (isDirty || hasPendingImages) && !isSubmitting,
  );

  if (isError)
    return (
      <ErrorState
        description="دریافت اطلاعات هیرو ناموفق بود."
        onRetry={() => refetch()}
      />
    );
  if (isPending || !hero) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const previewImage = previews.image ?? hero.image;
  const values = watch();

  return (
    <form
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      className="flex flex-col gap-6"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          <section className="glass-card flex flex-col gap-4 p-6">
            <h2 className="m-0 text-sm font-bold text-white">تصاویر</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <SingleImageField
                  label="تصویر دسکتاپ"
                  currentUrl={hero.image}
                  onFileSelected={(file) => {
                    setImageFiles((prev) => ({ ...prev, image: file }));
                    setPreviews((prev) => ({
                      ...prev,
                      image: URL.createObjectURL(file),
                    }));
                  }}
                />
                <p className="m-0 text-[11px] text-slate-500">
                  ابعاد پیشنهادی: ۲۴۰۰×۱۳۵۰ (۱۶:۹)
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <SingleImageField
                  label="تصویر موبایل (اختیاری)"
                  currentUrl={hero.imageMobile}
                  onFileSelected={(file) => {
                    setImageFiles((prev) => ({ ...prev, imageMobile: file }));
                    setPreviews((prev) => ({
                      ...prev,
                      imageMobile: URL.createObjectURL(file),
                    }));
                  }}
                />
                <p className="m-0 text-[11px] text-slate-500">
                  ابعاد پیشنهادی: ۱۲۰۰×۱۶۰۰ (۳:۴)
                </p>
              </div>
            </div>
            <Field
              label="متن جایگزین تصویر"
              htmlFor="h-image-alt"
              error={errors.imageAlt?.message}
            >
              <Input id="h-image-alt" {...register("imageAlt")} />
            </Field>
          </section>

          <section className="glass-card flex flex-col gap-4 p-6">
            <h2 className="m-0 text-sm font-bold text-white">متن‌ها</h2>
            <Field
              label="عنوان"
              htmlFor="h-title"
              error={errors.title?.message}
            >
              <Input id="h-title" {...register("title")} />
            </Field>
            <Field
              label="زیرعنوان"
              htmlFor="h-subtitle"
              error={errors.subtitle?.message}
            >
              <Input id="h-subtitle" {...register("subtitle")} />
            </Field>
            <Field
              label="کپشن (مونو)"
              htmlFor="h-caption"
              error={errors.caption?.message}
              hint="مثال: PLA · FDM · 0.2MM LAYER"
            >
              <Input id="h-caption" dir="ltr" {...register("caption")} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="متن دکمه"
                htmlFor="h-cta-label"
                error={errors.ctaLabel?.message}
              >
                <Input id="h-cta-label" {...register("ctaLabel")} />
              </Field>
              <Field
                label="لینک دکمه"
                htmlFor="h-cta-url"
                error={errors.ctaUrl?.message}
              >
                <Input id="h-cta-url" dir="ltr" {...register("ctaUrl")} />
              </Field>
            </div>
          </section>

          <section className="glass-card flex flex-col gap-4 p-6">
            <Switch
              checked={watch("isActive")}
              onChange={(v) => setValue("isActive", v, { shouldDirty: true })}
              label="نمایش این هیرو در صفحه اصلی"
            />
            <p className="m-0 text-[11px] text-slate-500">
              در صورت غیرفعال بودن، صفحه اصلی به هیرو پیش‌فرض بازمی‌گردد.
            </p>
          </section>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <section className="glass-card flex flex-col gap-3 p-4">
            <h2 className="m-0 text-xs font-bold text-slate-400">پیش‌نمایش</h2>
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-ink-800">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-xs text-slate-600">
                  بدون تصویر
                </div>
              )}
              <div className="absolute inset-0 flex flex-col justify-end gap-1.5 bg-gradient-to-t from-ink-950/90 via-ink-950/30 to-transparent p-4">
                {values.caption && (
                  <p className="m-0 font-mono text-[10px] tracking-wide text-brand-300">
                    {values.caption}
                  </p>
                )}
                <h3 className="m-0 text-sm font-extrabold leading-snug text-white">
                  {values.title || "عنوان هیرو"}
                </h3>
                <p className="m-0 line-clamp-2 text-[11px] leading-5 text-slate-300">
                  {values.subtitle}
                </p>
                {values.ctaLabel && (
                  <span className="mt-1 inline-block w-fit rounded-lg bg-brand-500/90 px-3 py-1 text-[10px] font-bold text-ink-950">
                    {values.ctaLabel}
                  </span>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting || (!isDirty && !hasPendingImages)}
        >
          {isSubmitting ? "در حال ذخیره…" : "ذخیره هیرو"}
        </Button>
      </div>

      <ConfirmDialog
        open={blocker.state === "blocked"}
        title="تغییرات ذخیره‌نشده"
        description="اگر خارج شوید، تغییرات این بخش ذخیره نخواهد شد."
        confirmLabel="خروج بدون ذخیره"
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </form>
  );
}
