import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { getProductSpecs, saveProductSpecs } from "@/lib/catalogApi";
import { useToast } from "@/lib/ToastContext";
import type { ProductSpecRow } from "@/types/catalog";

/** F-02 §۲ — مشخصات سطح محصول بر اساس SpecificationDefinition دسته: انتخاب
 * از مقادیر تعریف‌شده یا مقدار سفارشی. محورهای واریانت در ویرایشگر واریانت‌اند. */
export function SpecsCard({
  productId,
  categoryId,
}: {
  productId: string;
  categoryId: string;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["product-specs", productId, categoryId],
    queryFn: () => getProductSpecs(productId),
  });
  const [values, setValues] = useState<Record<string, ProductSpecRow>>({});

  useEffect(() => {
    if (data)
      setValues(Object.fromEntries(data.specs.map((s) => [s.definitionId, s])));
  }, [data]);

  const save = useMutation({
    mutationFn: () => saveProductSpecs(productId, Object.values(values)),
    onSuccess: (saved) => {
      queryClient.setQueryData(["product-specs", productId, categoryId], saved);
      toast.showSuccess("مشخصات ذخیره شد.");
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "ذخیره ناموفق بود.",
      ),
  });

  if (isPending || !data) return <Skeleton className="h-40 w-full" />;
  const definitions = data.definitions.filter((d) => !d.isVariantAxis);
  const setRow = (definitionId: string, patch: Partial<ProductSpecRow>) =>
    setValues((v) => ({
      ...v,
      [definitionId]: {
        ...(v[definitionId] ?? {
          definitionId,
          valueId: null,
          customValue: "",
        }),
        ...patch,
      },
    }));

  return (
    <section className="glass-card flex flex-col gap-4 p-6">
      <h2 className="m-0 text-sm font-bold text-white">مشخصات فنی</h2>
      {definitions.length === 0 ? (
        <p className="m-0 text-xs text-slate-500">
          برای این دسته مشخصه‌ای تعریف نشده است (بخش «مشخصات محصولات»).
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {definitions.map((d) => {
            const row = values[d.id];
            const label = `${d.nameFa}${d.unit ? ` (${d.unit})` : ""}${d.isRequired ? " *" : ""}`;
            return (
              <Field key={d.id} label={label} htmlFor={`spec-${d.id}`}>
                {d.values.length > 0 ? (
                  <div className="flex gap-2">
                    <Select
                      id={`spec-${d.id}`}
                      value={row?.valueId ?? ""}
                      onChange={(e) =>
                        setRow(d.id, {
                          valueId: e.target.value || null,
                          customValue: "",
                        })
                      }
                    >
                      <option value="">
                        {row?.customValue ? "مقدار سفارشی" : "—"}
                      </option>
                      {d.values.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.value}
                        </option>
                      ))}
                    </Select>
                    <Input
                      aria-label={`مقدار سفارشی ${d.nameFa}`}
                      placeholder="سفارشی"
                      className="w-28"
                      value={row?.customValue ?? ""}
                      onChange={(e) =>
                        setRow(d.id, {
                          customValue: e.target.value,
                          valueId: null,
                        })
                      }
                    />
                  </div>
                ) : (
                  <Input
                    id={`spec-${d.id}`}
                    dir={d.type === "NUMBER" ? "ltr" : undefined}
                    value={row?.customValue ?? ""}
                    onChange={(e) =>
                      setRow(d.id, {
                        customValue: e.target.value,
                        valueId: null,
                      })
                    }
                  />
                )}
              </Field>
            );
          })}
        </div>
      )}
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={save.isPending || definitions.length === 0}
          onClick={() => save.mutate()}
        >
          {save.isPending ? "در حال ذخیره…" : "ذخیره‌ی مشخصات"}
        </Button>
      </div>
    </section>
  );
}
