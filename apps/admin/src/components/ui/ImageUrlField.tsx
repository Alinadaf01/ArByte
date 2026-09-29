import { useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { uploadImage } from "@/lib/catalogApi";
import { useToast } from "@/lib/ToastContext";

/** F-02 — فیلد تصویر رشته‌ای: فایل به `/admin/uploads/` می‌رود (WebP سمت
 * سرور) و فقط مسیر برگشتی در فرم نگه داشته می‌شود. */
export function ImageUrlField({
  label,
  value,
  onChange,
  folder,
  hint,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  folder: "products" | "categories" | "brands" | "homepage";
  hint?: string;
}) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      onChange(await uploadImage(file, folder));
    } catch (error) {
      toast.showError(
        error instanceof Error ? error.message : "آپلود ناموفق بود.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-slate-300">{label}</span>
      <div className="relative grid aspect-video place-items-center overflow-hidden rounded-xl border border-dashed border-white/10 bg-ink-800/40">
        {value ? (
          <>
            <img src={value} alt="" className="size-full object-contain" />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="icon-btn absolute end-2 top-2 !bg-ink-900/80"
              aria-label={`حذف ${label}`}
            >
              <X className="size-4" />
            </button>
          </>
        ) : (
          <label className="flex cursor-pointer flex-col items-center gap-1 p-4 text-xs text-slate-500">
            <ImagePlus className="size-6" strokeWidth={1.6} />
            {uploading ? "در حال آپلود…" : "انتخاب تصویر"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
        )}
      </div>
      {hint && <p className="m-0 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
