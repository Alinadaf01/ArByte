import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { SingleImageField } from "@/components/ui/SingleImageField";
import { createBlogPost, updateBlogPost } from "@/lib/api";
import {
  blogPostFormSchema,
  type BlogPostFormSchemaValues,
} from "@/lib/blogSchema";
import { useToast } from "@/lib/ToastContext";
import { BLOG_CATEGORIES, type AdminBlogPost } from "@/types/blog";

function newSectionId(): string {
  return `s-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function BlogFormModal({
  post,
  open,
  onClose,
}: {
  post: AdminBlogPost | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEdit = !!post;
  const [coverImage, setCoverImage] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BlogPostFormSchemaValues>({
    resolver: zodResolver(blogPostFormSchema),
    defaultValues: {
      slug: "",
      title: "",
      excerpt: "",
      category: BLOG_CATEGORIES[0],
      sections: [],
      author: "",
      authorRole: "",
      tags: "",
      readingTime: 3,
      coverAlt: "",
      isPublished: false,
      metaTitle: "",
      metaDescription: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "sections",
  });

  useEffect(() => {
    if (!open) return;
    setCoverImage(null);
    if (post) {
      reset({
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        category: post.category,
        sections: post.sections,
        author: post.author,
        authorRole: post.authorRole,
        tags: post.tags.join(", "),
        readingTime: post.readingTime,
        coverAlt: post.coverAlt ?? "",
        isPublished: post.isPublished,
        metaTitle: post.metaTitle,
        metaDescription: post.metaDescription,
      });
    } else {
      reset({
        slug: "",
        title: "",
        excerpt: "",
        category: BLOG_CATEGORIES[0],
        sections: [],
        author: "",
        authorRole: "",
        tags: "",
        readingTime: 3,
        coverAlt: "",
        isPublished: false,
        metaTitle: "",
        metaDescription: "",
      });
    }
  }, [open, post, reset]);

  const mutation = useMutation({
    mutationFn: (values: BlogPostFormSchemaValues) =>
      isEdit
        ? updateBlogPost(post!.id, values, coverImage)
        : createBlogPost(values, coverImage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
      toast.showSuccess(isEdit ? "مطلب ویرایش شد." : "مطلب ایجاد شد.");
      onClose();
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "ذخیره ناموفق بود.",
      ),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "ویرایش مطلب بلاگ" : "افزودن مطلب بلاگ"}
      widthClass="max-w-2xl"
    >
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto pe-1"
      >
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="عنوان"
            htmlFor="b-title"
            required
            error={errors.title?.message}
          >
            <Input id="b-title" {...register("title")} />
          </Field>
          <Field
            label="اسلاگ"
            htmlFor="b-slug"
            required
            error={errors.slug?.message}
          >
            <Input id="b-slug" dir="ltr" {...register("slug")} />
          </Field>
        </div>
        <Field
          label="خلاصه"
          htmlFor="b-excerpt"
          required
          error={errors.excerpt?.message}
        >
          <Textarea id="b-excerpt" {...register("excerpt")} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="دسته‌بندی"
            htmlFor="b-category"
            required
            error={errors.category?.message}
          >
            <Select id="b-category" {...register("category")}>
              {BLOG_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex flex-col justify-end gap-1 pb-2 text-xs text-slate-400">
            زمان مطالعه:{" "}
            {post ? `${post.readingTime.toLocaleString("fa-IR")} دقیقه` : "—"}
            <span className="text-[11px] text-slate-500">
              بعد از ذخیره از روی متن بخش‌ها خودکار حساب می‌شود.
            </span>
          </div>
        </div>

        <SingleImageField
          label="تصویر کاور"
          currentUrl={post?.resolvedCoverUrl || post?.coverImage || null}
          onFileSelected={setCoverImage}
        />
        <Field
          label="متن جایگزین کاور (alt)"
          htmlFor="b-cover-alt"
          error={errors.coverAlt?.message}
        >
          <Input id="b-cover-alt" {...register("coverAlt")} />
        </Field>

        <div className="flex flex-col gap-3 rounded-xl border border-white/[0.06] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="m-0 text-xs font-semibold text-slate-300">
                بخش‌های مطلب
              </p>
              <p className="m-0 mt-1 text-[11px] leading-5 text-slate-500">
                پاراگراف‌ها با خط خالی جدا می‌شوند؛ خطی که با «&gt; » شروع شود
                نقل‌قول است. HTML ساده (پررنگ، لینک، فهرست، تصویر) هم مجاز است و
                بقیه‌ی تگ‌ها سمت سرور حذف می‌شوند.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                append({ id: newSectionId(), heading: "", body: "" })
              }
              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-brand-500/30 hover:text-brand-300"
            >
              + افزودن بخش
            </button>
          </div>
          {fields.length === 0 && (
            <p className="m-0 text-xs text-slate-500">هنوز بخشی افزوده نشده.</p>
          )}
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="flex flex-col gap-2 rounded-lg border border-white/[0.06] bg-ink-800/40 p-3"
            >
              <div className="flex items-center gap-2">
                <Input
                  placeholder="عنوان بخش"
                  {...register(`sections.${index}.heading`)}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label="حذف بخش"
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
              <Textarea
                placeholder="متن بخش"
                {...register(`sections.${index}.body`)}
              />
              {errors.sections?.[index] && (
                <p className="m-0 text-[11px] text-danger">
                  {errors.sections[index]?.heading?.message ||
                    errors.sections[index]?.body?.message}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="نویسنده"
            htmlFor="b-author"
            required
            error={errors.author?.message}
          >
            <Input id="b-author" {...register("author")} />
          </Field>
          <Field label="نقش نویسنده" htmlFor="b-author-role">
            <Input id="b-author-role" {...register("authorRole")} />
          </Field>
        </div>
        <Field label="برچسب‌ها" htmlFor="b-tags" hint="با کاما جدا کنید">
          <Input id="b-tags" {...register("tags")} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="عنوان متا" htmlFor="b-meta-title">
            <Input id="b-meta-title" {...register("metaTitle")} />
          </Field>
          <Field label="توضیحات متا" htmlFor="b-meta-desc">
            <Input id="b-meta-desc" {...register("metaDescription")} />
          </Field>
        </div>
        <Switch
          checked={watch("isPublished")}
          onChange={(v) => setValue("isPublished", v, { shouldDirty: true })}
          label="منتشر شده"
        />

        <div className="sticky bottom-0 mt-2 flex justify-end gap-3 bg-ink-850/95 pt-2">
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
