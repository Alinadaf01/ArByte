import { useRef, useState } from "react";

export function SingleImageField({
  label,
  currentUrl,
  onFileSelected,
  hint,
}: {
  label: string;
  currentUrl: string | null;
  onFileSelected: (file: File) => void;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    onFileSelected(file);
  }

  const displayUrl = preview ?? currentUrl;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-slate-300">{label}</span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="grid h-24 w-full place-items-center overflow-hidden rounded-xl border border-dashed border-white/15 bg-ink-800/60 text-slate-500 transition-colors hover:border-brand-500/40 hover:text-brand-300"
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt=""
            className="h-full max-w-full object-contain p-2"
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
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      {hint && <p className="m-0 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
