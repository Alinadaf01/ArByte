import { useRef, useState, type DragEvent } from "react";
import { cn } from "@/lib/cn";

export interface UploaderImage {
  id: string;
  image: string;
  alt: string;
  order: number;
}

export interface ImageUploaderProps {
  images: UploaderImage[];
  disabled?: boolean;
  uploading?: boolean;
  onUpload: (file: File) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

/** Multi-image uploader with drag-to-reorder; the first image (lowest
 * `order`) is always the primary/OG image, matching ProductImage.order's
 * "order=1 is primary" convention on the backend. */
export function ImageUploader({
  images,
  disabled,
  uploading,
  onUpload,
  onDelete,
  onReorder,
}: ImageUploaderProps) {
  const sorted = [...images].sort((a, b) => a.order - b.order);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = "";
  }

  function handleDrop(e: DragEvent<HTMLDivElement>, targetId: string) {
    e.preventDefault();
    setOverId(null);
    if (!dragId || dragId === targetId) return;
    const ids = sorted.map((img) => img.id);
    const fromIndex = ids.indexOf(dragId);
    const toIndex = ids.indexOf(targetId);
    ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, dragId);
    onReorder(ids);
    setDragId(null);
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {sorted.map((img, index) => (
          <div
            key={img.id}
            draggable={!disabled}
            onDragStart={() => setDragId(img.id)}
            onDragOver={(e) => {
              e.preventDefault();
              setOverId(img.id);
            }}
            onDragLeave={() =>
              setOverId((prev) => (prev === img.id ? null : prev))
            }
            onDrop={(e) => handleDrop(e, img.id)}
            className={cn(
              "group relative aspect-square cursor-move overflow-hidden rounded-xl border border-white/[0.06] bg-ink-800/60 transition-all",
              overId === img.id &&
                "border-brand-500/50 ring-2 ring-brand-500/30",
            )}
          >
            <img
              src={img.image}
              alt={img.alt}
              className="h-full w-full object-cover"
            />
            {index === 0 && (
              <span className="chip absolute start-2 top-2 bg-brand-500/80 text-ink-950">
                تصویر اصلی
              </span>
            )}
            <button
              type="button"
              onClick={() => onDelete(img.id)}
              disabled={disabled}
              aria-label="حذف تصویر"
              className="absolute end-2 top-2 grid size-7 place-items-center rounded-lg bg-ink-950/80 text-slate-300 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
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

        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="grid aspect-square place-items-center rounded-xl border border-dashed border-white/15 text-slate-500 transition-all duration-300 hover:border-brand-500/40 hover:text-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex flex-col items-center gap-1.5 text-xs font-semibold">
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
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            {uploading ? "در حال آپلود…" : "افزودن تصویر"}
          </span>
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <p className="mt-2 text-[11px] text-slate-500">
        تصاویر را بکشید تا ترتیب را تغییر دهید. اولین تصویر، تصویر اصلی محصول
        است.
      </p>
    </div>
  );
}
