import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  listAttributes,
  listAttributeValues,
  getProductSpecs,
  createAttributeValue,
  putProductSpecs,
} from "@/lib/api";
import { useToast } from "@/lib/ToastContext";
import type { Attribute } from "@/types/attribute";
import type { ProductSpecEntry } from "@/types/product";

type ResolvedSpec = { valueOptionId: number | null; text: string };
const CUSTOM_SENTINEL = "__custom__";

function SelectSpecField({
  attribute,
  initial,
  onResolve,
}: {
  attribute: Attribute;
  initial: ResolvedSpec;
  onResolve: (attributeId: number, value: ResolvedSpec) => void;
}) {
  const { data: values } = useQuery({
    queryKey: ["attribute-values", attribute.id],
    queryFn: () => listAttributeValues(attribute.id),
  });
  const [customMode, setCustomMode] = useState(
    !initial.valueOptionId && !!initial.text,
  );
  const [valueOptionId, setValueOptionId] = useState<number | null>(
    initial.valueOptionId,
  );
  const [text, setText] = useState(initial.text);

  useEffect(() => {
    onResolve(
      Number(attribute.id),
      customMode ? { valueOptionId: null, text } : { valueOptionId, text: "" },
    );
  }, [attribute.id, customMode, valueOptionId, text, onResolve]);

  return (
    <div className="flex flex-col gap-2">
      <Select
        value={customMode ? CUSTOM_SENTINEL : (valueOptionId ?? "")}
        onChange={(e) => {
          if (e.target.value === CUSTOM_SENTINEL) {
            setCustomMode(true);
            setValueOptionId(null);
          } else {
            setCustomMode(false);
            setValueOptionId(e.target.value ? Number(e.target.value) : null);
          }
        }}
      >
        <option value="">— انتخاب نشده —</option>
        {values?.map((v) => (
          <option key={v.id} value={v.id}>
            {v.value}
          </option>
        ))}
        <option value={CUSTOM_SENTINEL}>+ مقدار دلخواه</option>
      </Select>
      {customMode && (
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="مقدار جدید — پس از ذخیره به لیست اضافه می‌شود"
        />
      )}
    </div>
  );
}

function TextSpecField({
  attribute,
  initial,
  numeric,
  onResolve,
}: {
  attribute: Attribute;
  initial: ResolvedSpec;
  numeric: boolean;
  onResolve: (attributeId: number, value: ResolvedSpec) => void;
}) {
  const [text, setText] = useState(initial.text);
  useEffect(() => {
    onResolve(Number(attribute.id), { valueOptionId: null, text });
  }, [attribute.id, text, onResolve]);
  return (
    <Input
      type={numeric ? "number" : "text"}
      value={text}
      onChange={(e) => setText(e.target.value)}
    />
  );
}

function BooleanSpecField({
  attribute,
  initial,
  onResolve,
}: {
  attribute: Attribute;
  initial: ResolvedSpec;
  onResolve: (attributeId: number, value: ResolvedSpec) => void;
}) {
  const [text, setText] = useState(initial.text || "خیر");
  useEffect(() => {
    onResolve(Number(attribute.id), { valueOptionId: null, text });
  }, [attribute.id, text, onResolve]);
  return (
    <Select value={text} onChange={(e) => setText(e.target.value)}>
      <option value="بله">بله</option>
      <option value="خیر">خیر</option>
    </Select>
  );
}

export function ProductSpecsSection({
  productId,
  categoryId,
}: {
  productId: string;
  categoryId: number | null;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [specMap, setSpecMap] = useState<Record<number, ResolvedSpec>>({});

  const updateSpec = useCallback((attributeId: number, value: ResolvedSpec) => {
    setSpecMap((prev) => ({ ...prev, [attributeId]: value }));
  }, []);

  const { data: attributes, isPending: attributesPending } = useQuery({
    queryKey: ["attributes", categoryId],
    queryFn: () => listAttributes(categoryId ?? undefined),
    enabled: !!categoryId,
  });

  const { data: existingSpecs, isPending: specsPending } = useQuery({
    queryKey: ["product-specs", productId],
    queryFn: () => getProductSpecs(productId),
  });

  const existingByAttribute = useMemo(() => {
    const map = new Map<number, ResolvedSpec>();
    for (const row of existingSpecs ?? []) {
      map.set(row.attributeId, {
        valueOptionId: row.valueOptionId,
        text: row.valueText ?? "",
      });
    }
    return map;
  }, [existingSpecs]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries: ProductSpecEntry[] = [];
      for (const attribute of attributes ?? []) {
        const id = Number(attribute.id);
        const resolved = specMap[id] ?? existingByAttribute.get(id);
        if (!resolved) continue;
        if (resolved.valueOptionId) {
          entries.push({
            attributeId: id,
            valueOptionId: resolved.valueOptionId,
          });
        } else if (resolved.text.trim()) {
          if (attribute.inputType === "select") {
            const promoted = await createAttributeValue(
              attribute.id,
              resolved.text.trim(),
            );
            entries.push({
              attributeId: id,
              valueOptionId: Number(promoted.id),
            });
          } else {
            entries.push({ attributeId: id, valueText: resolved.text.trim() });
          }
        }
      }
      return putProductSpecs(productId, entries);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-specs", productId] });
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      queryClient.invalidateQueries({ queryKey: ["attribute-values"] });
      toast.showSuccess("مشخصات ذخیره شد.");
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "ذخیره مشخصات ناموفق بود.",
      ),
  });

  return (
    <section className="glass-card p-6">
      <h2 className="m-0 text-sm font-bold text-white">مشخصات</h2>
      <p className="mt-1 text-xs text-slate-500">
        بر اساس دسته‌بندی انتخاب‌شده؛ برای هر فیلد یک مقدار از پیش‌تعریف‌شده
        انتخاب کنید یا مقدار دلخواه وارد کنید.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        {attributesPending || specsPending ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))
        ) : !attributes || attributes.length === 0 ? (
          <p className="text-xs text-slate-500">
            برای این دسته‌بندی هنوز مشخصه‌ای تعریف نشده. از بخش «مشخصات محصولات»
            اضافه کنید.
          </p>
        ) : (
          attributes.map((attribute) => {
            const initial = existingByAttribute.get(Number(attribute.id)) ?? {
              valueOptionId: null,
              text: "",
            };
            return (
              <Field
                key={attribute.id}
                label={`${attribute.name}${attribute.unit ? ` (${attribute.unit})` : ""}`}
                required={attribute.isRequired}
              >
                {attribute.inputType === "select" ? (
                  <SelectSpecField
                    attribute={attribute}
                    initial={initial}
                    onResolve={updateSpec}
                  />
                ) : attribute.inputType === "boolean" ? (
                  <BooleanSpecField
                    attribute={attribute}
                    initial={initial}
                    onResolve={updateSpec}
                  />
                ) : (
                  <TextSpecField
                    attribute={attribute}
                    initial={initial}
                    numeric={attribute.inputType === "number"}
                    onResolve={updateSpec}
                  />
                )}
              </Field>
            );
          })
        )}
      </div>

      {attributes && attributes.length > 0 && (
        <div className="mt-5 flex justify-end">
          <Button
            type="button"
            size="sm"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? "در حال ذخیره…" : "ذخیره مشخصات"}
          </Button>
        </div>
      )}
    </section>
  );
}
