import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Field";
import { createColor, updateColor, deleteColor } from "@/lib/api";
import { useToast } from "@/lib/ToastContext";
import type { ColorOption } from "@/types/product";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function ProductColorsSection({
  productId,
  colors,
}: {
  productId: string;
  colors: ColorOption[];
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#000000");
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["product", productId] });

  const createMutation = useMutation({
    mutationFn: () => {
      const nextOrder =
        colors.length > 0 ? Math.max(...colors.map((c) => c.order)) + 1 : 0;
      return createColor(productId, {
        name: name.trim(),
        hex,
        inStock: true,
        order: nextOrder,
      });
    },
    onSuccess: () => {
      invalidate();
      setName("");
      setHex("#000000");
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "افزودن رنگ ناموفق بود.",
      ),
  });

  const toggleStockMutation = useMutation({
    mutationFn: (color: ColorOption) =>
      updateColor(productId, color.id, { inStock: !color.inStock }),
    onSuccess: invalidate,
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "ویرایش رنگ ناموفق بود.",
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (colorId: string) => deleteColor(productId, colorId),
    onSuccess: invalidate,
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "حذف رنگ ناموفق بود.",
      ),
  });

  const validHex = HEX_RE.test(hex);

  return (
    <section className="glass-card p-6">
      <h2 className="m-0 text-sm font-bold text-white">رنگ‌ها</h2>
      <p className="mt-1 text-xs text-slate-500">
        هر رنگ به‌صورت جداگانه موجود/ناموجود است.
      </p>

      <ul className="mt-4 m-0 flex list-none flex-col gap-2 p-0">
        {colors
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((color) => (
            <li
              key={color.id}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-ink-800/40 px-3.5 py-2.5"
            >
              <span
                className="size-6 shrink-0 rounded-full border border-white/10"
                style={{ backgroundColor: color.hex }}
              />
              <span className="flex-1 text-sm font-medium text-slate-200">
                {color.name}
              </span>
              <span className="text-[11px] text-slate-500" dir="ltr">
                {color.hex}
              </span>
              <Switch
                checked={color.inStock}
                onChange={() => toggleStockMutation.mutate(color)}
                label={color.inStock ? "موجود" : "ناموجود"}
              />
              <button
                type="button"
                onClick={() => deleteMutation.mutate(color.id)}
                aria-label="حذف رنگ"
                className="icon-btn !h-8 !w-8 hover:!text-danger"
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
            </li>
          ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label
            className="text-xs font-semibold text-slate-300"
            htmlFor="new-color-name"
          >
            نام رنگ
          </label>
          <Input
            id="new-color-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثلاً مشکی"
            className="w-40"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            className="text-xs font-semibold text-slate-300"
            htmlFor="new-color-hex"
          >
            کد رنگ
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={validHex ? hex : "#000000"}
              onChange={(e) => setHex(e.target.value)}
              className="size-10 cursor-pointer rounded-lg border border-white/[0.06] bg-ink-800/60"
              aria-label="انتخاب رنگ"
            />
            <Input
              id="new-color-hex"
              dir="ltr"
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              className="w-28"
            />
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={!name.trim() || !validHex || createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          + افزودن رنگ
        </Button>
      </div>
    </section>
  );
}
