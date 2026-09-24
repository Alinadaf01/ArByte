"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { comparePage } from "@arbyte/contracts";
import type { ProductCard } from "@arbyte/contracts";
import { searchProductsClient } from "@/lib/catalog-client";

interface AddDevicePickerProps {
  excludeSlugs: readonly string[];
  onPick: (slug: string) => void;
  onClose: () => void;
}

const DEBOUNCE_MS = 300;

/**
 * T-215 §۲ — «این تنها راه افزودن است» (سند تسک). جستجوی زنده روی همان
 * `GET /catalog/search` (سمت کلاینت، `catalog-client.ts`).
 */
export function AddDevicePicker({
  excludeSlugs,
  onPick,
  onClose,
}: AddDevicePickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductCard[]>([]);
  const debounceRef = useRef<number | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current !== undefined)
      window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      const items = await searchProductsClient(query);
      setResults(items.filter((p) => !excludeSlugs.includes(p.slug)));
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(debounceRef.current);
  }, [query, excludeSlugs]);

  return (
    <div className="border-border-done bg-surface flex flex-col gap-3 rounded-panel border p-4">
      <div className="flex items-center justify-between gap-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={comparePage.addDevicePickerPlaceholder}
          className="text-input text-primary min-w-0 flex-1 border-0 bg-transparent outline-none"
        />
        <button
          type="button"
          onClick={onClose}
          className="text-secondary hover:bg-surface-muted flex h-9 w-9 flex-none items-center justify-center rounded-full transition-colors duration-200"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          >
            <path d="m7 7 10 10M17 7 7 17" />
          </svg>
        </button>
      </div>
      {query.trim() ? (
        <div className="flex flex-col gap-1">
          {results.length === 0 ? (
            <p className="text-caption text-secondary px-1 py-2">
              {comparePage.addDevicePickerEmpty}
            </p>
          ) : (
            results.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => onPick(product.slug)}
                className="hover:bg-surface-muted flex items-center gap-3 rounded-tile-sm p-2 text-start transition-colors duration-200"
              >
                <span className="bg-surface-muted relative h-11 w-11 flex-none overflow-hidden rounded-tile-sm">
                  {product.image ? (
                    <Image
                      src={product.image.url}
                      alt=""
                      fill
                      sizes="44px"
                      className="object-contain p-1"
                    />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-caption text-primary block truncate font-emphasis">
                    {product.name}
                  </span>
                  <span className="text-micro text-secondary block">
                    {product.category.name}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
