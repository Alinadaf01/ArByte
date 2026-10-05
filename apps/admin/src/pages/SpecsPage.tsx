import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ListTree, Pencil, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Switch } from "@/components/ui/Field";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import {
  deleteSpecDefinition,
  deleteSpecValue,
  listCategories,
  listSpecDefinitions,
  saveSpecDefinition,
  saveSpecValue,
} from "@/lib/catalogApi";
import { useToast } from "@/lib/ToastContext";
import {
  SPEC_TYPE_LABELS,
  type AdminCategory,
  type SpecDefinition,
  type SpecType,
} from "@/types/catalog";

type Draft = Omit<SpecDefinition, "id" | "values" | "usageCount">;
const EMPTY: Draft = {
  key: "",
  nameFa: "",
  type: "SELECT",
  unit: "",
  category: null,
  isRequired: false,
  isFilterable: false,
  isSearchable: false,
  isVariantAxis: false,
  sortOrder: 0,
};

function useErrorToast() {
  const toast = useToast();
  return (error: unknown) =>
    toast.showError(
      error instanceof Error ? error.message : "عملیات ناموفق بود.",
    );
}

function DefinitionForm({
  definition,
  categories,
  onClose,
}: {
  definition: SpecDefinition | null;
  categories: AdminCategory[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const onError = useErrorToast();
  const [draft, setDraft] = useState<Draft>(
    definition ? { ...definition } : EMPTY,
  );
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const save = useMutation({
    mutationFn: () => saveSpecDefinition(definition?.id ?? null, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spec-definitions"] });
      toast.showSuccess("مشخصه ذخیره شد.");
      onClose();
    },
    onError,
  });
  const axisAllowed = draft.type === "SELECT" || draft.type === "COLOR";
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="نام فارسی" htmlFor="d-name">
          <Input
            id="d-name"
            required
            value={draft.nameFa}
            onChange={(e) => set("nameFa", e.target.value)}
          />
        </Field>
        <Field label="کلید (لاتین، یکتا)" htmlFor="d-key">
          <Input
            id="d-key"
            dir="ltr"
            required
            value={draft.key}
            onChange={(e) => set("key", e.target.value)}
          />
        </Field>
        <Field label="نوع" htmlFor="d-type">
          <Select
            id="d-type"
            value={draft.type}
            onChange={(e) => set("type", e.target.value as SpecType)}
          >
            {Object.entries(SPEC_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="واحد" htmlFor="d-unit" hint="مثلاً GB یا اینچ">
          <Input
            id="d-unit"
            value={draft.unit ?? ""}
            onChange={(e) => set("unit", e.target.value)}
          />
        </Field>
        <Field
          label="دسته"
          htmlFor="d-category"
          hint="خالی = برای همه‌ی دسته‌ها"
        >
          <Select
            id="d-category"
            value={draft.category ?? ""}
            onChange={(e) => set("category", e.target.value || null)}
          >
            <option value="">همه‌ی دسته‌ها</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="ترتیب" htmlFor="d-order">
          <Input
            id="d-order"
            type="number"
            min={0}
            value={draft.sortOrder}
            onChange={(e) => set("sortOrder", Number(e.target.value))}
          />
        </Field>
        <Field
          label="جایگاه در مشخصات کلیدی"
          htmlFor="d-key-order"
          hint="کارت و صفحه‌ی محصول؛ خالی یعنی جزو مشخصات کلیدی نیست."
        >
          <Input
            id="d-key-order"
            type="number"
            min={1}
            value={draft.keySpecOrder ?? ""}
            onChange={(e) =>
              set(
                "keySpecOrder",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-5">
        <Switch
          checked={draft.isRequired}
          onChange={(v) => set("isRequired", v)}
          label="اجباری"
        />
        <Switch
          checked={draft.isFilterable}
          onChange={(v) => set("isFilterable", v)}
          label="قابل فیلتر"
        />
        <Switch
          checked={draft.isSearchable}
          onChange={(v) => set("isSearchable", v)}
          label="قابل جستجو"
        />
        {axisAllowed && (
          <Switch
            checked={draft.isVariantAxis}
            onChange={(v) => set("isVariantAxis", v)}
            label="محور واریانت"
          />
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          انصراف
        </Button>
        <Button type="submit" size="sm" disabled={save.isPending}>
          ذخیره
        </Button>
      </div>
    </form>
  );
}

function ValuesEditor({ definition }: { definition: SpecDefinition }) {
  const queryClient = useQueryClient();
  const onError = useErrorToast();
  const [value, setValue] = useState("");
  const [swatch, setSwatch] = useState("#6C4DFF");
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["spec-definitions"] });
  const add = useMutation({
    mutationFn: () =>
      saveSpecValue(definition.id, null, {
        value: value.trim(),
        swatchHex: definition.type === "COLOR" ? swatch : null,
      }),
    onSuccess: () => {
      setValue("");
      refresh();
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteSpecValue(definition.id, id),
    onSuccess: refresh,
    onError,
  });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {definition.values.length === 0 && (
          <span className="text-xs text-slate-500">مقداری تعریف نشده.</span>
        )}
        {definition.values.map((v) => (
          <span
            key={v.id}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-200"
          >
            {v.swatchHex && (
              <span
                className="size-3 rounded-full border border-white/20"
                style={{ background: v.swatchHex }}
              />
            )}
            {v.value}
            <button
              type="button"
              className="text-slate-500 hover:text-danger"
              aria-label={`حذف ${v.value}`}
              onClick={() => remove.mutate(v.id)}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) add.mutate();
        }}
      >
        <Input
          className="w-48"
          placeholder="مقدار تازه"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        {definition.type === "COLOR" && (
          <input
            type="color"
            aria-label="رنگ"
            value={swatch}
            onChange={(e) => setSwatch(e.target.value)}
            className="h-9 w-12 rounded"
          />
        )}
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          disabled={add.isPending || !value.trim()}
        >
          افزودن
        </Button>
      </form>
    </div>
  );
}

export default function SpecsPage() {
  const queryClient = useQueryClient();
  const onError = useErrorToast();
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState<SpecDefinition | "new" | null>(null);
  const [valuesFor, setValuesFor] = useState<string | null>(null);
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(),
  });
  const {
    data: definitions = [],
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["spec-definitions", category],
    queryFn: () => listSpecDefinitions(category),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteSpecDefinition(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["spec-definitions"] }),
    onError,
  });
  const categoryName = (id: string | null) =>
    id ? (categories?.results.find((c) => c.id === id)?.name ?? "—") : "همه";
  const current = definitions.find((d) => d.id === valuesFor) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="مشخصات محصولات"
        description="تعریف مشخصه‌ها برای هر دسته؛ مشخصه‌های «انتخابی» و «رنگ» می‌توانند محور واریانت باشند."
        actions={
          <Button onClick={() => setEditing("new")}>+ مشخصه‌ی جدید</Button>
        }
      />
      <section className="glass-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-6 py-4">
          <Select
            className="w-auto"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">همه‌ی مشخصه‌ها</option>
            <option value="global">فقط عمومی</option>
            {categories?.results.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        {isError ? (
          <ErrorState
            description="دریافت مشخصات ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && definitions.length === 0 ? (
          <EmptyState
            icon={ListTree}
            title="مشخصه‌ای نیست"
            description="اولین مشخصه را تعریف کنید."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-start text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                  <th className="px-6 py-3 font-medium">مشخصه</th>
                  <th className="px-4 py-3 font-medium">نوع</th>
                  <th className="px-4 py-3 font-medium">دسته</th>
                  <th className="px-4 py-3 font-medium">ویژگی</th>
                  <th className="px-4 py-3 font-medium">مقادیر</th>
                  <th className="px-4 py-3 font-medium">عملیات</th>
                </tr>
              </thead>
              {isPending ? (
                <TableSkeleton rows={5} cols={6} />
              ) : (
                <tbody className="divide-y divide-white/[0.04]">
                  {definitions.map((d) => (
                    <tr key={d.id}>
                      <td className="px-6 py-3">
                        <p className="m-0 font-semibold text-white">
                          {d.nameFa}{" "}
                          {d.unit && (
                            <span className="text-xs text-slate-500">
                              ({d.unit})
                            </span>
                          )}
                        </p>
                        <p
                          className="m-0 font-mono text-[11px] text-slate-500"
                          dir="ltr"
                        >
                          {d.key}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {SPEC_TYPE_LABELS[d.type]}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {categoryName(d.category)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {d.isVariantAxis && (
                            <Chip tone="brand">محور واریانت</Chip>
                          )}
                          {d.keySpecOrder != null && (
                            <Chip tone="success">کلیدی {d.keySpecOrder}</Chip>
                          )}
                          {d.isFilterable && <Chip tone="neutral">فیلتر</Chip>}
                          {d.isRequired && <Chip tone="warning">اجباری</Chip>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="text-xs text-brand-300 hover:text-brand-200"
                          onClick={() => setValuesFor(d.id)}
                        >
                          {d.values.length.toLocaleString("fa-IR")} مقدار
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label={`ویرایش ${d.nameFa}`}
                            onClick={() => setEditing(d)}
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            className="icon-btn hover:!text-danger"
                            aria-label={`حذف ${d.nameFa}`}
                            onClick={() => remove.mutate(d.id)}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        )}
      </section>
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "مشخصه‌ی جدید" : "ویرایش مشخصه"}
        widthClass="max-w-2xl"
      >
        {editing !== null && (
          <DefinitionForm
            definition={editing === "new" ? null : editing}
            categories={categories?.results ?? []}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>
      <Modal
        open={current !== null}
        onClose={() => setValuesFor(null)}
        title={current ? `مقادیر «${current.nameFa}»` : ""}
      >
        {current && <ValuesEditor definition={current} />}
      </Modal>
    </div>
  );
}
