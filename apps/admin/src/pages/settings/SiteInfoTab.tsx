import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Field, Input, Switch, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { SingleImageField } from "@/components/ui/SingleImageField";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/Stateviews";
import { getSiteSettings, updateSiteSettings } from "@/lib/api";
import {
  siteSettingsFormSchema,
  type SiteSettingsFormValues,
} from "@/lib/settingsSchema";
import { useUnsavedChangesGuard } from "@/lib/useUnsavedChangesGuard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/lib/ToastContext";

type ImageKey =
  | "trustBadgeImage"
  | "paymentGatewayImage"
  | "logoLight"
  | "logoDark"
  | "favicon"
  | "defaultOgImage";

export function SiteInfoTab() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [imageFiles, setImageFiles] = useState<Partial<Record<ImageKey, File>>>(
    {},
  );

  const {
    data: settings,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["site-settings"],
    queryFn: getSiteSettings,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SiteSettingsFormValues>({
    resolver: zodResolver(siteSettingsFormSchema),
    defaultValues: {
      businessName: "",
      economicCode: "",
      nationalId: "",
      phoneDisplay: "",
      phoneHref: "",
      email: "",
      address: "",
      businessHours: [],
      instagramUrl: "",
      telegramUrl: "",
      whatsappUrl: "",
      linkedinUrl: "",
      youtubeUrl: "",
      pinterestUrl: "",
      googleMapsEmbed: "",
      latitude: null,
      longitude: null,
      trustBadgeLabel: "",
      trustBadgeUrl: "",
      paymentGatewayLabel: "",
      googleAnalyticsId: "",
      googleTagManagerId: "",
      ownerNotificationPhone: "",
      notifyOwnerNewOrder: true,
      postalCode: "",
      testPeriodDays: 7,
      warrantyTerms: "",
      cardToCardActive: true,
      cardToCardHolderName: "",
      cardToCardNumber: "",
      cardToCardSheba: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "businessHours",
  });

  useEffect(() => {
    if (!settings) return;
    reset({
      businessName: settings.businessName,
      economicCode: settings.economicCode,
      nationalId: settings.nationalId,
      phoneDisplay: settings.phoneDisplay,
      phoneHref: settings.phoneHref,
      email: settings.email,
      address: settings.address,
      businessHours: settings.businessHours,
      instagramUrl: settings.instagramUrl,
      telegramUrl: settings.telegramUrl,
      whatsappUrl: settings.whatsappUrl,
      linkedinUrl: settings.linkedinUrl,
      youtubeUrl: settings.youtubeUrl,
      pinterestUrl: settings.pinterestUrl,
      googleMapsEmbed: settings.googleMapsEmbed,
      latitude: settings.latitude,
      longitude: settings.longitude,
      trustBadgeLabel: settings.trustBadgeLabel,
      trustBadgeUrl: settings.trustBadgeUrl,
      paymentGatewayLabel: settings.paymentGatewayLabel,
      googleAnalyticsId: settings.googleAnalyticsId,
      googleTagManagerId: settings.googleTagManagerId,
      ownerNotificationPhone: settings.ownerNotificationPhone,
      notifyOwnerNewOrder: settings.notifyOwnerNewOrder,
      postalCode: settings.postalCode,
      testPeriodDays: settings.testPeriodDays,
      warrantyTerms: settings.warrantyTerms,
      cardToCardActive: settings.cardToCardActive,
      cardToCardHolderName: settings.cardToCardHolderName,
      cardToCardNumber: settings.cardToCardNumber,
      cardToCardSheba: settings.cardToCardSheba,
    });
    setImageFiles({});
  }, [settings, reset]);

  const mutation = useMutation({
    mutationFn: (values: SiteSettingsFormValues) =>
      updateSiteSettings(values, imageFiles),
    onSuccess: (saved, variables) => {
      queryClient.setQueryData(["site-settings"], saved);
      reset(variables);
      setImageFiles({});
      toast.showSuccess("تنظیمات ذخیره شد.");
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
        description="دریافت تنظیمات ناموفق بود."
        onRetry={() => refetch()}
      />
    );
  if (isPending || !settings) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      className="flex flex-col gap-6"
    >
      <section className="glass-card flex flex-col gap-4 p-6">
        <h2 className="m-0 text-sm font-bold text-white">مشخصات فروشنده</h2>
        <p className="m-0 text-xs text-slate-500">
          فقط روی فاکتور PDF نمایش داده می‌شود — در هیچ‌جای فروشگاه آنلاین دیده
          نمی‌شود.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field
            label="نام کسب‌وکار"
            htmlFor="s-business-name"
            error={errors.businessName?.message}
          >
            <Input id="s-business-name" {...register("businessName")} />
          </Field>
          <Field
            label="کد اقتصادی"
            htmlFor="s-economic-code"
            error={errors.economicCode?.message}
          >
            <Input
              id="s-economic-code"
              dir="ltr"
              {...register("economicCode")}
            />
          </Field>
          <Field
            label="شناسه ملی"
            htmlFor="s-national-id"
            error={errors.nationalId?.message}
          >
            <Input id="s-national-id" dir="ltr" {...register("nationalId")} />
          </Field>
        </div>
      </section>

      <section className="glass-card flex flex-col gap-4 p-6">
        <h2 className="m-0 text-sm font-bold text-white">تماس</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="شماره نمایشی"
            htmlFor="s-phone-display"
            error={errors.phoneDisplay?.message}
          >
            <Input id="s-phone-display" {...register("phoneDisplay")} />
          </Field>
          <Field
            label="شماره برای تماس مستقیم"
            htmlFor="s-phone-href"
            error={errors.phoneHref?.message}
            hint="مثال: +982112345678"
          >
            <Input id="s-phone-href" dir="ltr" {...register("phoneHref")} />
          </Field>
          <Field label="ایمیل" htmlFor="s-email" error={errors.email?.message}>
            <Input id="s-email" dir="ltr" {...register("email")} />
          </Field>
          <Field
            label="آدرس"
            htmlFor="s-address"
            error={errors.address?.message}
          >
            <Input id="s-address" {...register("address")} />
          </Field>
          <Field
            label="کد پستی"
            htmlFor="s-postal"
            error={errors.postalCode?.message}
            hint="روی فاکتور و کارت گارانتی"
          >
            <Input id="s-postal" dir="ltr" {...register("postalCode")} />
          </Field>
        </div>
      </section>

      <section className="glass-card flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="m-0 text-sm font-bold text-white">ساعات کاری</h2>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => append({ day: "", time: "" })}
          >
            + افزودن روز
          </Button>
        </div>
        {fields.length === 0 ? (
          <p className="m-0 text-xs text-slate-500">ساعت کاری ثبت نشده.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <Input
                  placeholder="روز (مثلاً شنبه تا چهارشنبه)"
                  {...register(`businessHours.${index}.day`)}
                />
                <Input
                  placeholder="ساعت (مثلاً ۹ تا ۱۸)"
                  {...register(`businessHours.${index}.time`)}
                />
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label="حذف"
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
            ))}
          </div>
        )}
      </section>

      <section className="glass-card flex flex-col gap-4 p-6">
        <h2 className="m-0 text-sm font-bold text-white">شبکه‌های اجتماعی</h2>
        <p className="m-0 text-xs text-slate-500">
          هرکدام را خالی بگذاری، همان یکی در فوتر و صفحه تماس با ما نمایش داده
          نمی‌شود.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="اینستاگرام"
            htmlFor="s-instagram"
            error={errors.instagramUrl?.message}
          >
            <Input
              id="s-instagram"
              dir="ltr"
              placeholder="خالی = نمایش داده نمی‌شود"
              {...register("instagramUrl")}
            />
          </Field>
          <Field
            label="تلگرام"
            htmlFor="s-telegram"
            error={errors.telegramUrl?.message}
          >
            <Input
              id="s-telegram"
              dir="ltr"
              placeholder="خالی = نمایش داده نمی‌شود"
              {...register("telegramUrl")}
            />
          </Field>
          <Field
            label="واتساپ"
            htmlFor="s-whatsapp"
            error={errors.whatsappUrl?.message}
          >
            <Input
              id="s-whatsapp"
              dir="ltr"
              placeholder="خالی = نمایش داده نمی‌شود"
              {...register("whatsappUrl")}
            />
          </Field>
          <Field
            label="لینکدین"
            htmlFor="s-linkedin"
            error={errors.linkedinUrl?.message}
          >
            <Input
              id="s-linkedin"
              dir="ltr"
              placeholder="خالی = نمایش داده نمی‌شود"
              {...register("linkedinUrl")}
            />
          </Field>
          <Field
            label="یوتیوب"
            htmlFor="s-youtube"
            error={errors.youtubeUrl?.message}
          >
            <Input
              id="s-youtube"
              dir="ltr"
              placeholder="خالی = نمایش داده نمی‌شود"
              {...register("youtubeUrl")}
            />
          </Field>
          <Field
            label="پینترست"
            htmlFor="s-pinterest"
            error={errors.pinterestUrl?.message}
          >
            <Input
              id="s-pinterest"
              dir="ltr"
              placeholder="خالی = نمایش داده نمی‌شود"
              {...register("pinterestUrl")}
            />
          </Field>
        </div>
      </section>

      <section className="glass-card flex flex-col gap-4 p-6">
        <h2 className="m-0 text-sm font-bold text-white">نقشه</h2>
        <Field
          label="کد embed نقشه گوگل"
          htmlFor="s-map-embed"
          error={errors.googleMapsEmbed?.message}
        >
          <Input id="s-map-embed" dir="ltr" {...register("googleMapsEmbed")} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="عرض جغرافیایی"
            htmlFor="s-lat"
            error={errors.latitude?.message}
          >
            <Input
              id="s-lat"
              type="number"
              step="any"
              dir="ltr"
              value={watch("latitude") ?? ""}
              onChange={(e) =>
                setValue(
                  "latitude",
                  e.target.value === "" ? null : Number(e.target.value),
                  { shouldDirty: true },
                )
              }
            />
          </Field>
          <Field
            label="طول جغرافیایی"
            htmlFor="s-lng"
            error={errors.longitude?.message}
          >
            <Input
              id="s-lng"
              type="number"
              step="any"
              dir="ltr"
              value={watch("longitude") ?? ""}
              onChange={(e) =>
                setValue(
                  "longitude",
                  e.target.value === "" ? null : Number(e.target.value),
                  { shouldDirty: true },
                )
              }
            />
          </Field>
        </div>
      </section>

      <section className="glass-card flex flex-col gap-4 p-6">
        <h2 className="m-0 text-sm font-bold text-white">
          نماد اعتماد و درگاه پرداخت
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="متن نماد اعتماد"
            htmlFor="s-trust-label"
            error={errors.trustBadgeLabel?.message}
          >
            <Input id="s-trust-label" {...register("trustBadgeLabel")} />
          </Field>
          <Field
            label="لینک نماد اعتماد"
            htmlFor="s-trust-url"
            error={errors.trustBadgeUrl?.message}
            hint="برای eNamad: کل کد نماد (که با <a ... کپی می‌کنی) را همینجا پیست کن — لینک و عکس نماد خودکار جدا و ذخیره می‌شوند. برای بقیه، فقط لینک ساده بنویس."
          >
            <Textarea
              id="s-trust-url"
              dir="ltr"
              rows={3}
              {...register("trustBadgeUrl")}
            />
          </Field>
          {settings.trustBadgeImageUrl && (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-xs font-semibold text-slate-300">
                پیش‌نمایش نماد (از eNamad، لحظه‌ای)
              </span>
              <img
                src={settings.trustBadgeImageUrl}
                alt="نماد اعتماد"
                className="h-16 w-16 object-contain"
              />
            </div>
          )}
          <Field
            label="متن نمایش درگاه پرداخت"
            htmlFor="s-gateway-label"
            error={errors.paymentGatewayLabel?.message}
          >
            <Input id="s-gateway-label" {...register("paymentGatewayLabel")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SingleImageField
            label="تصویر نماد اعتماد (فقط اگر eNamad نیست)"
            currentUrl={settings.trustBadgeImage}
            onFileSelected={(file) =>
              setImageFiles((prev) => ({ ...prev, trustBadgeImage: file }))
            }
            hint="فقط وقتی لینک بالا کد eNamad نیست استفاده می‌شود. PNG (پس‌زمینه شفاف) یا SVG، حداقل ۱۲۰×۱۲۰ پیکسل، زیر ۲۰۰ کیلوبایت."
          />
          <SingleImageField
            label="تصویر درگاه پرداخت"
            currentUrl={settings.paymentGatewayImage}
            onFileSelected={(file) =>
              setImageFiles((prev) => ({ ...prev, paymentGatewayImage: file }))
            }
            hint="لوگویی که کنار نماد اعتماد در فوتر نمایش داده می‌شود. PNG (پس‌زمینه شفاف) یا SVG، حداقل ۱۲۰×۱۲۰ پیکسل، زیر ۲۰۰ کیلوبایت."
          />
        </div>
      </section>

      <section className="glass-card flex flex-col gap-4 p-6">
        <h2 className="m-0 text-sm font-bold text-white">لوگو و آیکون</h2>
        <p className="m-0 text-xs text-slate-500">
          این چهار مورد فعلاً در سایت زنده استفاده نمی‌شوند — سایت از یک لوگوی
          طراحی‌شده ثابت استفاده می‌کند، نه از این آپلودها، و فاوآیکون/تصویر
          پیش‌فرض اشتراک‌گذاری هم از فایل‌های ثابت پروژه خوانده می‌شوند. اگر
          می‌خواهی این‌ها واقعاً در سایت اعمال شوند، به توسعه‌دهنده بگو تا وصل
          شوند.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SingleImageField
            label="لوگو روشن"
            currentUrl={settings.logoLight}
            onFileSelected={(file) =>
              setImageFiles((prev) => ({ ...prev, logoLight: file }))
            }
            hint="PNG یا SVG، پس‌زمینه شفاف، حداقل عرض ۲۴۰ پیکسل."
          />
          <SingleImageField
            label="لوگو تیره"
            currentUrl={settings.logoDark}
            onFileSelected={(file) =>
              setImageFiles((prev) => ({ ...prev, logoDark: file }))
            }
            hint="PNG یا SVG، پس‌زمینه شفاف، حداقل عرض ۲۴۰ پیکسل."
          />
          <SingleImageField
            label="فاوآیکون"
            currentUrl={settings.favicon}
            onFileSelected={(file) =>
              setImageFiles((prev) => ({ ...prev, favicon: file }))
            }
            hint="ICO یا PNG، ۳۲×۳۲ یا ۶۴×۶۴ پیکسل."
          />
          <SingleImageField
            label="تصویر پیش‌فرض OG"
            currentUrl={settings.defaultOgImage}
            onFileSelected={(file) =>
              setImageFiles((prev) => ({ ...prev, defaultOgImage: file }))
            }
            hint="JPG یا PNG، ۱۲۰۰×۶۳۰ پیکسل."
          />
        </div>
      </section>

      <section className="glass-card flex flex-col gap-4 p-6">
        <h2 className="m-0 text-sm font-bold text-white">تحلیل</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Google Analytics ID"
            htmlFor="s-ga"
            error={errors.googleAnalyticsId?.message}
          >
            <Input id="s-ga" dir="ltr" {...register("googleAnalyticsId")} />
          </Field>
          <Field
            label="Google Tag Manager ID"
            htmlFor="s-gtm"
            error={errors.googleTagManagerId?.message}
          >
            <Input id="s-gtm" dir="ltr" {...register("googleTagManagerId")} />
          </Field>
        </div>
      </section>

      <section className="glass-card flex flex-col gap-4 p-6">
        <h2 className="m-0 text-sm font-bold text-white">گارانتی و مهلت تست</h2>
        <Field
          label="مهلت تست (روز)"
          htmlFor="s-test-days"
          error={errors.testPeriodDays?.message}
          hint="از روز تحویل شمرده می‌شود و روی کارت گارانتی چاپ می‌شود."
        >
          <Input
            id="s-test-days"
            type="number"
            min={0}
            className="w-32"
            {...register("testPeriodDays")}
          />
        </Field>
        <Field
          label="شرایط گارانتی و مهلت تست"
          htmlFor="s-warranty-terms"
          error={errors.warrantyTerms?.message}
          hint="هر خط یک بند. خالی = بخش شرایط روی کارت گارانتی نمایش داده نمی‌شود."
        >
          <Textarea
            id="s-warranty-terms"
            rows={8}
            {...register("warrantyTerms")}
          />
        </Field>
      </section>

      <section className="glass-card flex flex-col gap-4 p-6">
        <h2 className="m-0 text-sm font-bold text-white">کارت‌به‌کارت</h2>
        <Switch
          checked={watch("cardToCardActive")}
          onChange={(v) =>
            setValue("cardToCardActive", v, { shouldDirty: true })
          }
          label="روش کارت‌به‌کارت در صفحه‌ی پرداخت فعال باشد"
        />
        <p className="m-0 text-xs text-slate-500">
          روش فقط وقتی به مشتری نشان داده می‌شود که روشن باشد و هر سه فیلد زیر
          پر باشند.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field
            label="نام صاحب حساب"
            htmlFor="s-c2c-name"
            error={errors.cardToCardHolderName?.message}
          >
            <Input id="s-c2c-name" {...register("cardToCardHolderName")} />
          </Field>
          <Field
            label="شماره کارت"
            htmlFor="s-c2c-card"
            error={errors.cardToCardNumber?.message}
          >
            <Input
              id="s-c2c-card"
              dir="ltr"
              {...register("cardToCardNumber")}
            />
          </Field>
          <Field
            label="شماره شبا"
            htmlFor="s-c2c-sheba"
            error={errors.cardToCardSheba?.message}
          >
            <Input
              id="s-c2c-sheba"
              dir="ltr"
              {...register("cardToCardSheba")}
            />
          </Field>
        </div>
      </section>

      <section className="glass-card flex flex-col gap-4 p-6">
        <h2 className="m-0 text-sm font-bold text-white">اعلان کارفرما</h2>
        <Field
          label="شماره‌های اعلان (با کاما جدا شود)"
          htmlFor="s-owner-phone"
          error={errors.ownerNotificationPhone?.message}
          hint="مثال: 09120000000,09121111111"
        >
          <Input
            id="s-owner-phone"
            dir="ltr"
            {...register("ownerNotificationPhone")}
          />
        </Field>
        <Switch
          checked={watch("notifyOwnerNewOrder")}
          onChange={(v) =>
            setValue("notifyOwnerNewOrder", v, { shouldDirty: true })
          }
          label="پیامک هنگام پرداخت موفق سفارش جدید"
        />
      </section>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting || (!isDirty && !hasPendingImages)}
        >
          {isSubmitting ? "در حال ذخیره…" : "ذخیره تنظیمات"}
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
