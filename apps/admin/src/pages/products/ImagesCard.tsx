import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GripVertical, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import {
  deleteProductImage,
  reorderProductImages,
  updateProductImage,
  uploadProductImages,
} from "@/lib/catalogApi";
import { useToast } from "@/lib/ToastContext";
import { cn } from "@/lib/cn";
import type { AdminProduct, ProductImage } from "@/types/catalog";

/** F-02 §۲ — آپلود چندتایی (alt اجباری برای هر فایل)، ترتیب با کشیدن،
 * تصویر اصلی؛ تبدیل به WebP سمت سرور. */
export function ImagesCard({ product }: { product: AdminProduct }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<
    { file: File; alt: string; preview: string }[]
  >([]);
  const [dragId, setDragId] = useState<number | null>(null);
  const images = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["product", product.id] });
  const onError = (error: unknown) =>
    toast.showError(
      error instanceof Error ? error.message : "عملیات ناموفق بود.",
    );

  const upload = useMutation({
    mutationFn: () =>
      uploadProductImages(
        product.id,
        pending.map(({ file, alt }) => ({ file, alt: alt.trim() })),
      ),
    onSuccess: () => {
      pending.forEach((p) => URL.revokeObjectURL(p.preview));
      setPending([]);
      refresh();
      toast.showSuccess("تصاویر آپلود شد.");
    },
    onError,
  });
  const update = useMutation({
    mutationFn: ({
      image,
      data,
    }: {
      image: ProductImage;
      data: { altText?: string; isPrimary?: boolean };
    }) => updateProductImage(product.id, image.id, data),
    onSuccess: refresh,
    onError,
  });
  const remove = useMutation({
    mutationFn: (image: ProductImage) =>
      deleteProductImage(product.id, image.id),
    onSuccess: refresh,
    onError,
  });
  const reorder = useMutation({
    mutationFn: (ids: number[]) => reorderProductImages(product.id, ids),
    onSuccess: refresh,
    onError,
  });

  function drop(targetId: number) {
    if (dragId === null || dragId === targetId) return;
    const ids = images.map((i) => i.id).filter((id) => id !== dragId);
    ids.splice(ids.indexOf(targetId), 0, dragId);
    reorder.mutate(ids);
    setDragId(null);
  }

  return (
    <section className="glass-card flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-sm font-bold text-white">تصاویر</h2>
        <label className="cursor-pointer text-xs font-semibold text-brand-300 hover:text-brand-200">
          + افزودن تصویر
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              setPending((p) => [
                ...p,
                ...files.map((file) => ({
                  file,
                  alt: product.name,
                  preview: URL.createObjectURL(file),
                })),
              ]);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {images.length === 0 && pending.length === 0 && (
        <p className="m-0 text-xs text-slate-500">هنوز تصویری ندارد.</p>
      )}

      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-4">
        {images.map((image) => (
          <li
            key={image.id}
            draggable
            onDragStart={() => setDragId(image.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => drop(image.id)}
            className={cn(
              "flex flex-col gap-2 rounded-xl border bg-ink-800/40 p-2",
              image.isPrimary ? "border-brand-500/60" : "border-white/[0.06]",
            )}
          >
            <div className="relative aspect-square overflow-hidden rounded-lg bg-white">
              <img
                src={image.url}
                alt={image.altText ?? ""}
                className="size-full object-contain"
              />
              <GripVertical
                className="absolute start-1 top-1 size-4 cursor-grab text-slate-500"
                aria-hidden="true"
              />
            </div>
            <Input
              defaultValue={image.altText ?? ""}
              aria-label="متن جایگزین"
              onBlur={(e) =>
                e.target.value.trim() !== (image.altText ?? "") &&
                update.mutate({ image, data: { altText: e.target.value } })
              }
            />
            <div className="flex items-center justify-between">
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1 text-[11px]",
                  image.isPrimary
                    ? "text-brand-300"
                    : "text-slate-500 hover:text-white",
                )}
                onClick={() =>
                  !image.isPrimary &&
                  update.mutate({ image, data: { isPrimary: true } })
                }
              >
                <Star
                  className="size-3.5"
                  fill={image.isPrimary ? "currentColor" : "none"}
                />{" "}
                {image.isPrimary ? "تصویر اصلی" : "اصلی کن"}
              </button>
              <button
                type="button"
                className="icon-btn hover:!text-danger"
                aria-label="حذف تصویر"
                onClick={() => remove.mutate(image)}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {pending.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-white/10 p-3">
          <p className="m-0 text-xs text-slate-400">
            برای هر تصویر متن جایگزین (alt) بنویسید:
          </p>
          {pending.map((p, index) => (
            <div key={p.preview} className="flex items-center gap-3">
              <img
                src={p.preview}
                alt=""
                className="size-12 rounded-lg object-cover"
              />
              <Input
                value={p.alt}
                aria-label={`alt تصویر ${index + 1}`}
                onChange={(e) =>
                  setPending((all) =>
                    all.map((x, i) =>
                      i === index ? { ...x, alt: e.target.value } : x,
                    ),
                  )
                }
              />
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPending([])}
            >
              انصراف
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={upload.isPending || pending.some((p) => !p.alt.trim())}
              onClick={() => upload.mutate()}
            >
              {upload.isPending
                ? "در حال آپلود…"
                : `آپلود ${pending.length.toLocaleString("fa-IR")} تصویر`}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
