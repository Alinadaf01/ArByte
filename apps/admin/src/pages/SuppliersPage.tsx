import { useDeferredValue, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Truck } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Stateviews";
import {
  deletePriceRule,
  deleteSupplier,
  deleteSupplierProduct,
  listCategories,
  listPriceRules,
  listPrices,
  listSupplierProducts,
  listSuppliers,
  recalculatePrices,
  savePriceRule,
  saveSupplier,
  saveSupplierProduct,
} from "@/lib/catalogApi";
import { formatPrice } from "@/lib/formatters";
import { useQueryFilters } from "@/lib/useQueryFilters";
import { useToast } from "@/lib/ToastContext";
import { cn } from "@/lib/cn";
import type { PriceRuleRow, RecalcChange, Supplier } from "@/types/catalog";

const TABS = [
  { key: "suppliers", label: "تأمین‌کنندگان" },
  { key: "prices", label: "قیمت همکار" },
  { key: "rules", label: "قوانین سود" },
  { key: "recalc", label: "بازمحاسبه" },
] as const;

function useOnError() {
  const toast = useToast();
  return (error: unknown) =>
    toast.showError(
      error instanceof Error ? error.message : "عملیات ناموفق بود.",
    );
}

function SuppliersTab() {
  const queryClient = useQueryClient();
  const onError = useOnError();
  const [editing, setEditing] = useState<Supplier | "new" | null>(null);
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: listSuppliers,
  });
  const remove = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
    onError,
  });
  return (
    <section className="glass-card overflow-hidden p-0">
      <div className="flex justify-end border-b border-white/[0.06] px-6 py-4">
        <Button size="sm" onClick={() => setEditing("new")}>
          + تأمین‌کننده
        </Button>
      </div>
      {suppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="تأمین‌کننده‌ای نیست"
          description="اولین همکار را اضافه کنید."
        />
      ) : (
        <table className="w-full text-start text-sm">
          <tbody className="divide-y divide-white/[0.04]">
            {suppliers.map((s) => (
              <tr key={s.id}>
                <td className="px-6 py-3">
                  <p className="m-0 font-semibold text-white">{s.name}</p>
                  <p className="m-0 text-[11px] text-slate-500">
                    {[s.contactName, s.contactPhone]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {s.productsCount.toLocaleString("fa-IR")} کالا
                </td>
                <td className="px-4 py-3">
                  <Chip tone={s.isActive ? "success" : "neutral"}>
                    {s.isActive ? "فعال" : "غیرفعال"}
                  </Chip>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`ویرایش ${s.name}`}
                      onClick={() => setEditing(s)}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="icon-btn hover:!text-danger"
                      aria-label={`حذف ${s.name}`}
                      onClick={() => remove.mutate(s.id)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "تأمین‌کننده‌ی جدید" : "ویرایش تأمین‌کننده"}
      >
        {editing !== null && (
          <SupplierForm
            supplier={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>
    </section>
  );
}

function SupplierForm({
  supplier,
  onClose,
}: {
  supplier: Supplier | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const onError = useOnError();
  const [draft, setDraft] = useState<Partial<Supplier>>(
    supplier ?? { name: "", isActive: true },
  );
  const save = useMutation({
    mutationFn: () => saveSupplier(supplier?.id ?? null, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      onClose();
    },
    onError,
  });
  const set = (key: keyof Supplier, value: string | boolean) =>
    setDraft((d) => ({ ...d, [key]: value }));
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <Field label="نام" htmlFor="sup-name">
        <Input
          id="sup-name"
          required
          value={draft.name ?? ""}
          onChange={(e) => set("name", e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="نام رابط" htmlFor="sup-contact">
          <Input
            id="sup-contact"
            value={draft.contactName ?? ""}
            onChange={(e) => set("contactName", e.target.value)}
          />
        </Field>
        <Field label="تلفن" htmlFor="sup-phone">
          <Input
            id="sup-phone"
            dir="ltr"
            value={draft.contactPhone ?? ""}
            onChange={(e) => set("contactPhone", e.target.value)}
          />
        </Field>
        <Field label="ایمیل" htmlFor="sup-email">
          <Input
            id="sup-email"
            dir="ltr"
            value={draft.contactEmail ?? ""}
            onChange={(e) => set("contactEmail", e.target.value)}
          />
        </Field>
      </div>
      <Field label="یادداشت" htmlFor="sup-notes">
        <Textarea
          id="sup-notes"
          value={draft.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
        />
      </Field>
      <Switch
        checked={!!draft.isActive}
        onChange={(v) => set("isActive", v)}
        label="فعال (غیرفعال = قیمتش در محاسبه نمی‌آید)"
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={save.isPending}>
          ذخیره
        </Button>
      </div>
    </form>
  );
}

function PricesTab() {
  const queryClient = useQueryClient();
  const onError = useOnError();
  const toast = useToast();
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: listSuppliers,
  });
  const [supplier, setSupplier] = useState("");
  const [search, setSearch] = useState("");
  const deferred = useDeferredValue(search);
  const [variant, setVariant] = useState<{ id: string; label: string } | null>(
    null,
  );
  const [price, setPrice] = useState(0);
  const { data: rows } = useQuery({
    queryKey: ["supplier-products", supplier],
    queryFn: () => listSupplierProducts({ supplier: supplier || undefined }),
  });
  const { data: found } = useQuery({
    queryKey: ["variant-search", deferred],
    queryFn: () => listPrices({ search: deferred }),
    enabled: deferred.trim().length > 1 && !variant,
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["supplier-products"] });
    queryClient.invalidateQueries({ queryKey: ["prices"] });
  };
  const add = useMutation({
    mutationFn: () =>
      saveSupplierProduct(null, {
        supplier,
        variant: variant!.id,
        price,
        isAvailable: true,
      }),
    onSuccess: () => {
      refresh();
      setVariant(null);
      setSearch("");
      setPrice(0);
      toast.showSuccess(
        "قیمت همکار ثبت شد؛ واریانت‌های «همکار + سود» بازمحاسبه شدند.",
      );
    },
    onError,
  });
  const update = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { price?: number; isAvailable?: boolean };
    }) => saveSupplierProduct(id, data),
    onSuccess: refresh,
    onError,
  });
  const remove = useMutation({
    mutationFn: deleteSupplierProduct,
    onSuccess: refresh,
    onError,
  });

  return (
    <div className="flex flex-col gap-4">
      <section className="glass-card flex flex-wrap items-end gap-3 p-5">
        <Field label="تأمین‌کننده" htmlFor="sp-supplier">
          <Select
            id="sp-supplier"
            className="w-auto"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          >
            <option value="">همه / انتخاب برای افزودن</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="واریانت (SKU یا نام)" htmlFor="sp-variant">
          <div className="relative">
            <Input
              id="sp-variant"
              className="w-64"
              value={variant ? variant.label : search}
              onChange={(e) => {
                setVariant(null);
                setSearch(e.target.value);
              }}
            />
            {!variant && found && found.results.length > 0 && (
              <div className="glass-card absolute z-20 mt-1 max-h-60 w-80 overflow-y-auto !bg-ink-850/95 p-1">
                {found.results.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className="block w-full rounded-lg px-3 py-2 text-start text-xs text-slate-200 hover:bg-white/[0.04]"
                    onClick={() =>
                      setVariant({
                        id: v.id,
                        label: `${v.sku} · ${v.productName}`,
                      })
                    }
                  >
                    <span dir="ltr" className="font-mono">
                      {v.sku}
                    </span>{" "}
                    · {v.productName}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Field>
        <Field label="قیمت همکار (تومان)" htmlFor="sp-price">
          <Input
            id="sp-price"
            type="number"
            min={0}
            className="w-40"
            value={price || ""}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </Field>
        <Button
          size="sm"
          disabled={!supplier || !variant || price <= 0 || add.isPending}
          onClick={() => add.mutate()}
        >
          ثبت
        </Button>
      </section>
      <section className="glass-card overflow-x-auto p-0">
        <table className="w-full min-w-[40rem] text-start text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
              <th className="px-6 py-3 font-medium">واریانت</th>
              <th className="px-4 py-3 font-medium">تأمین‌کننده</th>
              <th className="px-4 py-3 font-medium">قیمت همکار</th>
              <th className="px-4 py-3 font-medium">در دسترس</th>
              <th className="px-4 py-3" aria-hidden="true" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {rows?.results.map((r) => (
              <tr key={r.id}>
                <td className="px-6 py-3">
                  <p className="m-0 text-white">{r.productName}</p>
                  <p
                    className="m-0 font-mono text-[11px] text-slate-500"
                    dir="ltr"
                  >
                    {r.sku}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate-300">{r.supplierName}</td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    className="w-36"
                    aria-label={`قیمت همکار ${r.sku}`}
                    defaultValue={r.price}
                    onBlur={(e) =>
                      Number(e.target.value) !== r.price &&
                      update.mutate({
                        id: r.id,
                        data: { price: Number(e.target.value) },
                      })
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <Switch
                    checked={r.isAvailable}
                    onChange={(v) =>
                      update.mutate({ id: r.id, data: { isAvailable: v } })
                    }
                    label=""
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="icon-btn hover:!text-danger"
                    aria-label="حذف"
                    onClick={() => remove.mutate(r.id)}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows?.results.length === 0 && (
          <p className="p-6 text-xs text-slate-500">
            قیمت همکاری ثبت نشده است.
          </p>
        )}
      </section>
    </div>
  );
}

function RulesTab() {
  const queryClient = useQueryClient();
  const onError = useOnError();
  const { data: rules = [] } = useQuery({
    queryKey: ["price-rules"],
    queryFn: listPriceRules,
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: listSuppliers,
  });
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(),
  });
  const [draft, setDraft] = useState<{
    level: string;
    target: string;
    profitType: "AMOUNT" | "PERCENT";
    value: number;
  }>({ level: "global", target: "", profitType: "PERCENT", value: 10 });
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["price-rules"] });
  const add = useMutation({
    mutationFn: () =>
      savePriceRule(null, {
        supplier: draft.level === "supplier" ? draft.target : null,
        category: draft.level === "category" ? draft.target : null,
        profitType: draft.profitType,
        profitAmountToman: draft.profitType === "AMOUNT" ? draft.value : null,
        profitPercentBasisPoints:
          draft.profitType === "PERCENT" ? Math.round(draft.value * 100) : null,
        isActive: true,
      }),
    onSuccess: refresh,
    onError,
  });
  const toggle = useMutation({
    mutationFn: (r: PriceRuleRow) =>
      savePriceRule(r.id, { isActive: !r.isActive }),
    onSuccess: refresh,
    onError,
  });
  const remove = useMutation({
    mutationFn: deletePriceRule,
    onSuccess: refresh,
    onError,
  });
  const targetName = (r: PriceRuleRow) =>
    r.level === "supplier"
      ? suppliers.find((s) => s.id === r.supplier)?.name
      : r.level === "category"
        ? categories?.results.find((c) => c.id === r.category)?.name
        : "همه‌ی کالاها";
  const LEVEL = {
    supplier: "تأمین‌کننده",
    category: "دسته",
    global: "سراسری",
  } as const;

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-xs text-slate-400">
        ترتیب اولویت: سود خود واریانت ← قانون تأمین‌کننده ← قانون دسته (بعد
        دسته‌ی والد) ← قانون سراسری. قیمت به ۱۰۰۰ تومان بالا گرد می‌شود.
      </p>
      <section className="glass-card flex flex-wrap items-end gap-3 p-5">
        <Field label="سطح" htmlFor="rule-level">
          <Select
            id="rule-level"
            className="w-auto"
            value={draft.level}
            onChange={(e) =>
              setDraft((d) => ({ ...d, level: e.target.value, target: "" }))
            }
          >
            <option value="global">سراسری</option>
            <option value="category">دسته</option>
            <option value="supplier">تأمین‌کننده</option>
          </Select>
        </Field>
        {draft.level !== "global" && (
          <Field
            label={draft.level === "category" ? "دسته" : "تأمین‌کننده"}
            htmlFor="rule-target"
          >
            <Select
              id="rule-target"
              className="w-auto"
              value={draft.target}
              onChange={(e) =>
                setDraft((d) => ({ ...d, target: e.target.value }))
              }
            >
              <option value="">انتخاب</option>
              {(draft.level === "category"
                ? (categories?.results ?? [])
                : suppliers
              ).map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="نوع سود" htmlFor="rule-type">
          <Select
            id="rule-type"
            className="w-auto"
            value={draft.profitType}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                profitType: e.target.value as "AMOUNT" | "PERCENT",
              }))
            }
          >
            <option value="PERCENT">درصد</option>
            <option value="AMOUNT">مبلغ (تومان)</option>
          </Select>
        </Field>
        <Field
          label={draft.profitType === "PERCENT" ? "درصد" : "مبلغ"}
          htmlFor="rule-value"
        >
          <Input
            id="rule-value"
            type="number"
            min={0}
            step="0.01"
            className="w-32"
            value={draft.value}
            onChange={(e) =>
              setDraft((d) => ({ ...d, value: Number(e.target.value) }))
            }
          />
        </Field>
        <Button
          size="sm"
          disabled={
            add.isPending ||
            draft.value <= 0 ||
            (draft.level !== "global" && !draft.target)
          }
          onClick={() => add.mutate()}
        >
          افزودن قانون
        </Button>
      </section>
      <section className="glass-card overflow-x-auto p-0">
        <table className="w-full text-start text-sm">
          <tbody className="divide-y divide-white/[0.04]">
            {rules.map((r) => (
              <tr key={r.id}>
                <td className="px-6 py-3">
                  <Chip tone="brand">{LEVEL[r.level]}</Chip>{" "}
                  <span className="text-slate-200">{targetName(r) ?? "—"}</span>
                </td>
                <td className="px-4 py-3 text-white">
                  {r.profitType === "PERCENT"
                    ? `${((r.profitPercentBasisPoints ?? 0) / 100).toLocaleString("fa-IR")}٪`
                    : formatPrice(r.profitAmountToman ?? 0)}
                </td>
                <td className="px-4 py-3">
                  <Switch
                    checked={r.isActive}
                    onChange={() => toggle.mutate(r)}
                    label={r.isActive ? "فعال" : "غیرفعال"}
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="icon-btn hover:!text-danger"
                    aria-label="حذف قانون"
                    onClick={() => remove.mutate(r.id)}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rules.length === 0 && (
          <p className="p-6 text-xs text-slate-500">
            هنوز قانونی نیست؛ بدون قانون، قیمت «همکار + سود» محاسبه نمی‌شود.
          </p>
        )}
      </section>
    </div>
  );
}

function RecalcTab() {
  const toast = useToast();
  const onError = useOnError();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<{
    changes: RecalcChange[];
    skipped: { sku: string; reason: string }[];
  } | null>(null);
  const preview = useMutation({
    mutationFn: () => recalculatePrices(false),
    onSuccess: (r) => setResult(r),
    onError,
  });
  const apply = useMutation({
    mutationFn: () => recalculatePrices(true),
    onSuccess: (r) => {
      toast.showSuccess(`${r.count.toLocaleString("fa-IR")} قیمت به‌روز شد.`);
      setResult(null);
      queryClient.invalidateQueries({ queryKey: ["prices"] });
    },
    onError,
  });
  const REASON: Record<string, string> = {
    "no-supplier-price": "قیمت همکار ندارد",
    "no-rule": "قانون سودی نیست",
  };
  return (
    <section className="glass-card flex flex-col gap-4 p-6">
      <p className="m-0 text-sm text-slate-300">
        همه‌ی واریانت‌های «همکار + سود» با قیمت همکار و قانون‌های فعلی دوباره
        حساب می‌شوند؛ اول پیش‌نمایش، بعد اعمال.
      </p>
      <div>
        <Button
          size="sm"
          variant="secondary"
          disabled={preview.isPending}
          onClick={() => preview.mutate()}
        >
          پیش‌نمایش بازمحاسبه‌ی همه
        </Button>
      </div>
      {result && (
        <>
          {result.changes.length === 0 ? (
            <p className="m-0 text-xs text-success">همه‌ی قیمت‌ها به‌روزند.</p>
          ) : (
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="text-[11px] text-slate-500">
                  <th className="py-2 font-medium">واریانت</th>
                  <th className="py-2 font-medium">همکار</th>
                  <th className="py-2 font-medium">قبل ← بعد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {result.changes.map((c) => (
                  <tr key={c.variant}>
                    <td className="py-2 text-white">
                      {c.productName}{" "}
                      <span
                        dir="ltr"
                        className="font-mono text-[11px] text-slate-500"
                      >
                        {c.sku}
                      </span>
                    </td>
                    <td className="py-2 text-slate-400">
                      {formatPrice(c.supplierPrice)}
                    </td>
                    <td className="py-2 text-white">
                      {formatPrice(c.oldPrice)} ←{" "}
                      <b>{formatPrice(c.newPrice)}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {result.skipped.length > 0 && (
            <p className="m-0 text-xs text-warning">
              محاسبه‌نشده:{" "}
              {result.skipped
                .map((s) => `${s.sku} (${REASON[s.reason] ?? s.reason})`)
                .join("، ")}
            </p>
          )}
          {result.changes.length > 0 && (
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={apply.isPending}
                onClick={() => apply.mutate()}
              >
                اعمال {result.changes.length.toLocaleString("fa-IR")} تغییر
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default function SuppliersPage() {
  const [filters, setFilters] = useQueryFilters({ tab: "suppliers" });
  const tab = TABS.some((t) => t.key === filters.tab)
    ? filters.tab
    : "suppliers";
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="تأمین‌کنندگان و قیمت همکار"
        description="قیمت همکار هر واریانت، قانون‌های سود و بازمحاسبه‌ی قیمت نهایی — هیچ‌کدام در سایت دیده نمی‌شود."
      />
      <div className="flex gap-2 overflow-x-auto rounded-xl border border-white/[0.06] bg-ink-800/40 p-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilters({ tab: t.key })}
            className={cn(
              "flex-1 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold",
              tab === t.key
                ? "bg-brand-500/15 text-brand-300"
                : "text-slate-400 hover:text-white",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "suppliers" && <SuppliersTab />}
      {tab === "prices" && <PricesTab />}
      {tab === "rules" && <RulesTab />}
      {tab === "recalc" && <RecalcTab />}
    </div>
  );
}
