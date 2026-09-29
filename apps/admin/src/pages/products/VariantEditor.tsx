import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Input, Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  getProductVariants,
  previewVariantLabels,
  saveProductVariants,
} from "@/lib/catalogApi";
import { useToast } from "@/lib/ToastContext";
import { cn } from "@/lib/cn";
import type { SpecDefinitionRef, VariantRow } from "@/types/catalog";

const comboKey = (axisValues: Record<string, string>, axes: string[]) =>
  axes.map((a) => axisValues[a] ?? "").join("|");

function cartesian(lists: string[][]): string[][] {
  return lists.reduce<string[][]>(
    (acc, list) =>
      acc.flatMap((prefix) => list.map((item) => [...prefix, item])),
    [[]],
  );
}

/** F-02 §۲ — ویرایشگر واریانت: انتخاب محورها (مشخصه‌های is_variant_axis
 * دسته) → انتخاب مقادیر → ساخت ترکیب‌ها → جدول SKU/قیمت/موجودی/پیش‌فرض.
 * برچسب هر ردیف را سرور می‌سازد (پیش‌نمایش). محصول تک‌واریانت: بدون محور،
 * یک ردیف. ذخیره کل جدول را یکجا می‌فرستد. */
export function VariantEditor({
  productId,
  productSlug,
  categoryId,
}: {
  productId: string;
  productSlug: string;
  categoryId: string;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["product-variants", productId, categoryId],
    queryFn: () => getProductVariants(productId),
  });
  const [axes, setAxes] = useState<string[]>([]);
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [showCost, setShowCost] = useState(false);

  useEffect(() => {
    if (!data) return;
    setAxes(data.usedAxes);
    setRows(
      data.rows.length
        ? data.rows
        : [
            {
              sku: productSlug.toUpperCase(),
              name: "",
              axisValues: {},
              finalPrice: 0,
              compareAtPrice: null,
              isDefault: true,
              isPreorder: false,
              isActive: true,
              stock: 0,
            },
          ],
    );
    const used: Record<string, string[]> = {};
    for (const row of data.rows)
      for (const [a, v] of Object.entries(row.axisValues))
        used[a] = Array.from(new Set([...(used[a] ?? []), v]));
    setPicked(used);
  }, [data, productSlug]);

  const axisDefs = data?.axes ?? [];
  const axisById = useMemo(
    () => new Map(axisDefs.map((a) => [a.id, a])),
    [axisDefs],
  );
  const valueText = (axis: SpecDefinitionRef | undefined, id: string) =>
    axis?.values.find((v) => v.id === id)?.value ?? "";

  const labels = useQuery({
    queryKey: [
      "variant-labels",
      productId,
      axes,
      rows.map((r) => comboKey(r.axisValues, axes)),
    ],
    queryFn: () =>
      previewVariantLabels(
        productId,
        axes,
        rows.map((r) => ({ axisValues: r.axisValues })),
      ),
    enabled: axes.length > 0 && rows.length > 0,
  });

  const save = useMutation({
    mutationFn: () => saveProductVariants(productId, axes, rows),
    onSuccess: (saved) => {
      queryClient.setQueryData(
        ["product-variants", productId, categoryId],
        saved,
      );
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.showSuccess("واریانت‌ها ذخیره شد.");
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "ذخیره ناموفق بود.",
      ),
  });

  if (isPending || !data) return <Skeleton className="h-48 w-full" />;

  const update = (index: number, patch: Partial<VariantRow>) =>
    setRows((all) => all.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const setDefault = (index: number) =>
    setRows((all) => all.map((r, i) => ({ ...r, isDefault: i === index })));

  function toggleAxis(id: string) {
    setAxes((current) =>
      current.includes(id) ? current.filter((a) => a !== id) : [...current, id],
    );
  }

  function generate() {
    const lists = axes.map((a) => picked[a] ?? []);
    if (lists.some((l) => l.length === 0)) {
      toast.showError("برای هر محور دست‌کم یک مقدار انتخاب کنید.");
      return;
    }
    const existing = new Set(rows.map((r) => comboKey(r.axisValues, axes)));
    const base = rows.find((r) => r.isDefault) ?? rows[0];
    const fresh: VariantRow[] = cartesian(lists)
      .map((combo) => Object.fromEntries(axes.map((a, i) => [a, combo[i]])))
      .filter((axisValues) => !existing.has(comboKey(axisValues, axes)))
      .map((axisValues) => ({
        sku: [
          productSlug,
          ...axes.map((a) => valueText(axisById.get(a), axisValues[a])),
        ]
          .join("-")
          .replace(/\s+/g, "")
          .toUpperCase(),
        name: "",
        axisValues,
        finalPrice: base?.finalPrice ?? 0,
        compareAtPrice: null,
        isDefault: false,
        isPreorder: false,
        isActive: true,
        stock: 0,
      }));
    // ردیف تک‌واریانتِ بدون محور با اولین ترکیب جایگزین می‌شود، نه اینکه کنارش بماند.
    const keep = rows.filter(
      (r) => Object.keys(r.axisValues).length > 0 || r.id,
    );
    const next = [...keep, ...fresh];
    if (!next.some((r) => r.isDefault && r.isActive) && next.length)
      next[0] = { ...next[0], isDefault: true };
    setRows(next);
    if (!fresh.length)
      toast.showSuccess("همه‌ی ترکیب‌ها از قبل در جدول هستند.");
  }

  return (
    <section className="glass-card flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-sm font-bold text-white">واریانت‌ها</h2>
        {data.canEditCost && (
          <button
            type="button"
            className="text-xs text-brand-300 hover:text-brand-200"
            onClick={() => setShowCost((v) => !v)}
          >
            {showCost ? "پنهان کردن قیمت همکار/سود" : "نمایش قیمت همکار/سود"}
          </button>
        )}
      </div>

      {axisDefs.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-ink-800/30 p-4">
          <p className="m-0 text-xs text-slate-400">
            محورهای واریانت (از مشخصات دسته):
          </p>
          <div className="flex flex-wrap gap-2">
            {axisDefs.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => toggleAxis(a.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs",
                  axes.includes(a.id)
                    ? "border-brand-500 bg-brand-500/15 text-brand-200"
                    : "border-white/10 text-slate-400",
                )}
              >
                {a.nameFa}
              </button>
            ))}
          </div>
          {axes.map((axisId) => {
            const axis = axisById.get(axisId);
            if (!axis) return null;
            return (
              <div key={axisId} className="flex flex-wrap items-center gap-2">
                <span className="w-24 text-xs text-slate-300">
                  {axis.nameFa}:
                </span>
                {axis.values.map((v) => {
                  const on = picked[axisId]?.includes(v.id);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() =>
                        setPicked((p) => ({
                          ...p,
                          [axisId]: on
                            ? (p[axisId] ?? []).filter((x) => x !== v.id)
                            : [...(p[axisId] ?? []), v.id],
                        }))
                      }
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs",
                        on
                          ? "border-brand-400 text-white"
                          : "border-white/10 text-slate-500",
                      )}
                    >
                      {v.swatchHex && (
                        <span
                          className="size-3 rounded-full border border-white/20"
                          style={{ background: v.swatchHex }}
                        />
                      )}
                      {v.value}
                    </button>
                  );
                })}
              </div>
            );
          })}
          {axes.length > 0 && (
            <div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={generate}
              >
                ساخت ترکیب‌ها
              </Button>
            </div>
          )}
        </div>
      ) : (
        <p className="m-0 text-xs text-slate-500">
          این دسته محور واریانت ندارد؛ محصول تک‌واریانت است.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-start text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
              <th className="px-2 py-2 font-medium">برچسب</th>
              <th className="px-2 py-2 font-medium">SKU</th>
              <th className="px-2 py-2 font-medium">قیمت نهایی (تومان)</th>
              <th className="px-2 py-2 font-medium">قیمت قبل</th>
              <th className="px-2 py-2 font-medium">موجودی</th>
              <th className="px-2 py-2 font-medium">پیش‌فرض</th>
              <th className="px-2 py-2 font-medium">پیش‌فروش</th>
              <th className="px-2 py-2 font-medium">فعال</th>
              {showCost && (
                <th className="px-2 py-2 font-medium">
                  مدل قیمت / همکار / سود
                </th>
              )}
              <th className="px-2 py-2" aria-hidden="true" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {rows.map((row, index) => (
              <tr
                key={row.id ?? `new-${index}`}
                className={cn(!row.isActive && "opacity-50")}
              >
                <td className="px-2 py-2 text-slate-200">
                  {axes.length
                    ? labels.data?.labels[index] || "…"
                    : "بدون محور"}
                  {row.hasOrders && <Chip tone="neutral">سفارش دارد</Chip>}
                </td>
                <td className="px-2 py-2">
                  <Input
                    dir="ltr"
                    className="w-40"
                    aria-label="SKU"
                    value={row.sku}
                    onChange={(e) => update(index, { sku: e.target.value })}
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    type="number"
                    min={0}
                    className="w-36"
                    aria-label="قیمت نهایی"
                    value={row.finalPrice}
                    onChange={(e) =>
                      update(index, { finalPrice: Number(e.target.value) })
                    }
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    type="number"
                    min={0}
                    className="w-32"
                    aria-label="قیمت قبل از تخفیف"
                    value={row.compareAtPrice ?? ""}
                    onChange={(e) =>
                      update(index, {
                        compareAtPrice: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    type="number"
                    min={0}
                    className="w-24"
                    aria-label="موجودی"
                    value={row.stock}
                    onChange={(e) =>
                      update(index, { stock: Number(e.target.value) })
                    }
                  />
                  {!!row.reserved && (
                    <p className="m-0 mt-0.5 text-[10px] text-slate-500">
                      رزرو: {row.reserved.toLocaleString("fa-IR")}
                    </p>
                  )}
                </td>
                <td className="px-2 py-2 text-center">
                  <input
                    type="radio"
                    name="default-variant"
                    aria-label="پیش‌فرض"
                    checked={row.isDefault}
                    disabled={!row.isActive}
                    onChange={() => setDefault(index)}
                  />
                </td>
                <td className="px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    aria-label="پیش‌فروش"
                    checked={row.isPreorder}
                    onChange={(e) =>
                      update(index, { isPreorder: e.target.checked })
                    }
                  />
                </td>
                <td className="px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    aria-label="فعال"
                    checked={row.isActive}
                    onChange={(e) =>
                      update(index, {
                        isActive: e.target.checked,
                        isDefault: e.target.checked && row.isDefault,
                      })
                    }
                  />
                </td>
                {showCost && (
                  <td className="px-2 py-2">
                    <div className="flex gap-1">
                      <Select
                        className="w-24"
                        aria-label="مدل قیمت"
                        value={row.priceModel ?? "FIXED"}
                        onChange={(e) =>
                          update(index, {
                            priceModel: e.target
                              .value as VariantRow["priceModel"],
                          })
                        }
                      >
                        <option value="FIXED">ثابت</option>
                        <option value="SUPPLIER_PLUS_PROFIT">
                          همکار + سود
                        </option>
                      </Select>
                      <Input
                        type="number"
                        className="w-28"
                        aria-label="قیمت همکار"
                        placeholder="همکار"
                        value={row.supplierPrice ?? ""}
                        onChange={(e) =>
                          update(index, {
                            supplierPrice: e.target.value
                              ? Number(e.target.value)
                              : null,
                          })
                        }
                      />
                      <Input
                        type="number"
                        className="w-24"
                        aria-label="سود (تومان)"
                        placeholder="سود"
                        value={row.profitAmountToman ?? ""}
                        onChange={(e) =>
                          update(index, {
                            profitType: e.target.value ? "AMOUNT" : null,
                            profitAmountToman: e.target.value
                              ? Number(e.target.value)
                              : null,
                            profitPercentBasisPoints: null,
                          })
                        }
                      />
                    </div>
                  </td>
                )}
                <td className="px-2 py-2">
                  <button
                    type="button"
                    className="icon-btn hover:!text-danger"
                    aria-label="حذف واریانت"
                    title={
                      row.hasOrders
                        ? "سفارش دارد؛ پس از ذخیره حذف نرم (غیرفعال) می‌شود."
                        : undefined
                    }
                    onClick={() =>
                      setRows((all) => all.filter((_, i) => i !== index))
                    }
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-[11px] text-slate-500">
          محاسبه‌ی خودکار قیمت از همکار + سود در بخش بعدی فعال می‌شود؛ فعلاً فقط
          ذخیره می‌شود.
        </p>
        <Button
          type="button"
          disabled={save.isPending || rows.length === 0}
          onClick={() => save.mutate()}
        >
          {save.isPending ? "در حال ذخیره…" : "ذخیره‌ی واریانت‌ها"}
        </Button>
      </div>
    </section>
  );
}
