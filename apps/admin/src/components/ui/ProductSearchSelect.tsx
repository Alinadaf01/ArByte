import { useDeferredValue, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listProducts } from "@/lib/api";
import { Input } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

export interface PickedProduct {
  id: string;
  name: string;
  sku: string;
  slug: string;
  thumbnail?: string;
}

/** Searchable product picker — a plain `<select>` with 24+ products in one
 * long list is unusable and explicitly ruled out (HOMEPAGE-ADMIN-TASK.md
 * §4: "انتخاب محصول با جستجو، نه dropdown طولانی"). Debounces via
 * `useDeferredValue`, same pattern the storefront's own search already
 * uses — no extra dependency needed for this. */
export function ProductSearchSelect({
  value,
  onChange,
  disabled,
}: {
  value: PickedProduct | null;
  onChange: (product: PickedProduct | null) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isFetching } = useQuery({
    queryKey: ["products", "picker", deferredQuery],
    queryFn: () => listProducts({ search: deferredQuery, pageSize: 8 }),
    enabled: open && deferredQuery.trim().length > 0,
  });

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      )
        setOpen(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-ink-800/60 p-2.5">
        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-900/60 text-slate-600">
          {value.thumbnail ? (
            <img
              src={value.thumbnail}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
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
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 8.25V18a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18V8.25m-18 0V6a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 6v2.25m-18 0h18"
              />
            </svg>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {value.name}
          </p>
          <p className="truncate text-[11px] text-slate-500" dir="ltr">
            {value.sku}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={disabled}
          className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-brand-500/30 hover:text-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          تغییر
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="جستجوی نام یا کد کالا…"
        disabled={disabled}
      />
      {open && deferredQuery.trim() && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-white/[0.08] bg-ink-900 shadow-xl">
          {isFetching ? (
            <p className="p-3 text-xs text-slate-500">در حال جستجو…</p>
          ) : (data?.results.length ?? 0) === 0 ? (
            <p className="p-3 text-xs text-slate-500">محصولی یافت نشد.</p>
          ) : (
            data!.results.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => {
                  onChange({
                    id: product.id,
                    name: product.name,
                    sku: product.skus[0] ?? "",
                    slug: product.slug,
                    thumbnail: product.primaryImage ?? undefined,
                  });
                  setQuery("");
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 p-2.5 text-start transition-colors hover:bg-white/[0.04]",
                  "border-b border-white/[0.04] last:border-b-0",
                )}
              >
                <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-800/60">
                  {product.primaryImage && (
                    <img
                      src={product.primaryImage}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white">
                    {product.name}
                  </span>
                  <span
                    className="block truncate text-[11px] text-slate-500"
                    dir="ltr"
                  >
                    {product.skus.join("، ")}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
