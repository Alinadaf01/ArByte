import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  LayoutTemplate,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Switch } from "@/components/ui/Field";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ImageUrlField } from "@/components/ui/ImageUrlField";
import { ProductSearchSelect } from "@/components/ui/ProductSearchSelect";
import {
  deleteHomepageBlock,
  listCategories,
  listHomepageBlocks,
  listSpecDefinitions,
  reorderHomepageBlocks,
  saveHomepageBlock,
} from "@/lib/catalogApi";
import { formatJalaliDateTime } from "@/lib/formatters";
import { useToast } from "@/lib/ToastContext";
import { cn } from "@/lib/cn";
import {
  BLOCK_TYPE_LABELS,
  type HomepageBlock,
  type HomepageBlockType,
} from "@/types/catalog";

type Draft = Omit<HomepageBlock, "id" | "updatedAt" | "sortOrder">;
const MAX_GRID_CATEGORIES = 5;

const toLocal = (iso: string | null) =>
  iso ? new Date(iso).toISOString().slice(0, 16) : "";
const fromLocal = (value: string) =>
  value ? new Date(value).toISOString() : null;
const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];

function ConfigFields({
  draft,
  setConfig,
}: {
  draft: Draft;
  setConfig: (config: Record<string, unknown>) => void;
}) {
  const config = draft.config ?? {};
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(),
    enabled: draft.type === "CATEGORY_GRID",
  });
  const { data: specs } = useQuery({
    queryKey: ["spec-definitions", ""],
    queryFn: () => listSpecDefinitions(),
    enabled: draft.type === "FLAGSHIP_DUEL",
  });

  if (draft.type === "HERO") {
    return (
      <Field
        label="مسیر manifest فریم‌ها"
        htmlFor="cfg-frames"
        hint="مثلاً /hero/frames.json"
      >
        <Input
          id="cfg-frames"
          dir="ltr"
          value={String(config.framesManifest ?? "")}
          onChange={(e) => setConfig({ framesManifest: e.target.value })}
        />
      </Field>
    );
  }
  if (draft.type === "CATEGORY_GRID") {
    const picked = strings(config.categorySlugs);
    return (
      <Field
        label={`دسته‌ها (حداکثر ${MAX_GRID_CATEGORIES.toLocaleString("fa-IR")})`}
        htmlFor="cfg-cats"
      >
        <div id="cfg-cats" className="flex flex-wrap gap-2">
          {categories?.results.map((c) => {
            const on = picked.includes(c.slug);
            return (
              <button
                key={c.id}
                type="button"
                disabled={!on && picked.length >= MAX_GRID_CATEGORIES}
                onClick={() =>
                  setConfig({
                    categorySlugs: on
                      ? picked.filter((s) => s !== c.slug)
                      : [...picked, c.slug],
                  })
                }
                className={cn(
                  "rounded-full border px-3 py-1 text-xs disabled:opacity-40",
                  on
                    ? "border-brand-500 bg-brand-500/15 text-brand-200"
                    : "border-white/10 text-slate-400",
                )}
              >
                {on
                  ? `${(picked.indexOf(c.slug) + 1).toLocaleString("fa-IR")}. `
                  : ""}
                {c.name}
              </button>
            );
          })}
        </div>
      </Field>
    );
  }
  if (draft.type === "FLAGSHIP_DUEL") {
    const slugs = strings(config.productSlugs);
    const metrics = strings(config.metrics);
    const setSlug = (i: number, slug: string | null) => {
      const next = [slugs[0] ?? "", slugs[1] ?? ""];
      next[i] = slug ?? "";
      setConfig({ ...config, productSlugs: next });
    };
    const setMetric = (i: number, id: string) => {
      const next = [metrics[0] ?? "", metrics[1] ?? ""];
      next[i] = id;
      setConfig({ ...config, metrics: next });
    };
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-3">
            <Field
              label={`محصول ${i === 0 ? "اول" : "دوم"}`}
              htmlFor={`duel-${i}`}
            >
              <div className="flex flex-col gap-1">
                {slugs[i] && (
                  <span
                    className="font-mono text-[11px] text-brand-300"
                    dir="ltr"
                  >
                    {slugs[i]}
                  </span>
                )}
                <ProductSearchSelect
                  value={null}
                  onChange={(p) => setSlug(i, p?.slug ?? null)}
                />
              </div>
            </Field>
            <Field
              label={`مشخصه‌ی متریک ${i === 0 ? "اول" : "دوم"}`}
              htmlFor={`metric-${i}`}
            >
              <Select
                id={`metric-${i}`}
                value={metrics[i] ?? ""}
                onChange={(e) => setMetric(i, e.target.value)}
              >
                <option value="">انتخاب مشخصه</option>
                {specs?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nameFa}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ))}
      </div>
    );
  }
  if (draft.type === "PRODUCT_RAIL") {
    const slugs = strings(config.productSlugs);
    return (
      <Field label="محصولات ردیف" htmlFor="rail">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {slugs.map((slug) => (
              <span
                key={slug}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 font-mono text-[11px] text-slate-200"
                dir="ltr"
              >
                {slug}
                <button
                  type="button"
                  aria-label={`حذف ${slug}`}
                  onClick={() =>
                    setConfig({ productSlugs: slugs.filter((s) => s !== slug) })
                  }
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
          <ProductSearchSelect
            value={null}
            onChange={(p) =>
              p &&
              !slugs.includes(p.slug) &&
              setConfig({ productSlugs: [...slugs, p.slug] })
            }
          />
        </div>
      </Field>
    );
  }
  return (
    <p className="m-0 text-xs text-slate-500">
      این نوع بلوک تنظیمات اختصاصی ندارد.
    </p>
  );
}

function BlockForm({
  block,
  onClose,
}: {
  block: HomepageBlock | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(
    block
      ? { ...block }
      : {
          type: "PRODUCT_RAIL",
          isActive: true,
          title: "",
          subtitle: "",
          ctaLabel: "",
          ctaUrl: "",
          imageDesktop: null,
          imageMobile: null,
          imageAlt: "",
          config: {},
          startsAt: null,
          endsAt: null,
        },
  );
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const save = useMutation({
    mutationFn: () => saveHomepageBlock(block?.id ?? null, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-blocks"] });
      toast.showSuccess("بلوک ذخیره شد؛ صفحه‌ی اصلی فروشگاه به‌روز می‌شود.");
      onClose();
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "ذخیره ناموفق بود.",
      ),
  });
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="نوع بلوک" htmlFor="blk-type">
          <Select
            id="blk-type"
            value={draft.type}
            disabled={!!block}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                type: e.target.value as HomepageBlockType,
                config: {},
              }))
            }
          >
            {Object.entries(BLOCK_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="عنوان" htmlFor="blk-title">
          <Input
            id="blk-title"
            value={draft.title ?? ""}
            onChange={(e) => set("title", e.target.value)}
          />
        </Field>
        <Field label="زیرعنوان" htmlFor="blk-sub">
          <Input
            id="blk-sub"
            value={draft.subtitle ?? ""}
            onChange={(e) => set("subtitle", e.target.value)}
          />
        </Field>
        <Field label="دکمه (متن / لینک)" htmlFor="blk-cta">
          <div className="flex gap-2">
            <Input
              id="blk-cta"
              value={draft.ctaLabel ?? ""}
              onChange={(e) => set("ctaLabel", e.target.value)}
              placeholder="متن"
            />
            <Input
              dir="ltr"
              aria-label="لینک دکمه"
              value={draft.ctaUrl ?? ""}
              onChange={(e) => set("ctaUrl", e.target.value)}
              placeholder="/category/..."
            />
          </div>
        </Field>
        <Field label="شروع نمایش" htmlFor="blk-start" hint="خالی = از الان">
          <Input
            id="blk-start"
            type="datetime-local"
            value={toLocal(draft.startsAt)}
            onChange={(e) => set("startsAt", fromLocal(e.target.value))}
          />
        </Field>
        <Field label="پایان نمایش" htmlFor="blk-end" hint="خالی = بدون پایان">
          <Input
            id="blk-end"
            type="datetime-local"
            value={toLocal(draft.endsAt)}
            onChange={(e) => set("endsAt", fromLocal(e.target.value))}
          />
        </Field>
      </div>
      <ConfigFields
        draft={draft}
        setConfig={(config) => set("config", config)}
      />
      <details className="rounded-xl border border-white/[0.06] p-3">
        <summary className="cursor-pointer text-xs text-slate-400">
          تصویر بلوک (اختیاری)
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ImageUrlField
            label="دسکتاپ"
            folder="homepage"
            value={draft.imageDesktop}
            onChange={(v) => set("imageDesktop", v)}
          />
          <ImageUrlField
            label="موبایل"
            folder="homepage"
            value={draft.imageMobile}
            onChange={(v) => set("imageMobile", v)}
          />
        </div>
        <Field label="متن جایگزین تصویر" htmlFor="blk-alt">
          <Input
            id="blk-alt"
            value={draft.imageAlt ?? ""}
            onChange={(e) => set("imageAlt", e.target.value)}
          />
        </Field>
      </details>
      <Switch
        checked={draft.isActive}
        onChange={(v) => set("isActive", v)}
        label="فعال"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          انصراف
        </Button>
        <Button type="submit" size="sm" disabled={save.isPending}>
          {save.isPending ? "در حال ذخیره…" : "ذخیره"}
        </Button>
      </div>
    </form>
  );
}

export default function HomepagePage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<HomepageBlock | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HomepageBlock | null>(null);
  const {
    data: blocks = [],
    isPending,
    isError,
    refetch,
  } = useQuery({ queryKey: ["homepage-blocks"], queryFn: listHomepageBlocks });
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["homepage-blocks"] });
  const onError = (error: unknown) =>
    toast.showError(
      error instanceof Error ? error.message : "عملیات ناموفق بود.",
    );
  const reorder = useMutation({
    mutationFn: (ids: number[]) => reorderHomepageBlocks(ids),
    onSuccess: refresh,
    onError,
  });
  const toggle = useMutation({
    mutationFn: (b: HomepageBlock) =>
      saveHomepageBlock(b.id, { isActive: !b.isActive }),
    onSuccess: refresh,
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteHomepageBlock(id),
    onSuccess: refresh,
    onError,
    onSettled: () => setDeleteTarget(null),
  });

  function move(index: number, delta: number) {
    const ids = blocks.map((b) => Number(b.id));
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved);
    reorder.mutate(ids);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="صفحه اصلی"
        description="بلوک‌های صفحه‌ی اصلی فروشگاه: ترتیب، فعال بودن، زمان‌بندی و تنظیمات هر نوع. بعد از ذخیره صفحه‌ی اصلی تازه می‌شود."
        actions={<Button onClick={() => setEditing("new")}>+ بلوک جدید</Button>}
      />
      <section className="glass-card overflow-hidden p-0">
        {isError ? (
          <ErrorState
            description="دریافت بلوک‌ها ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && blocks.length === 0 ? (
          <EmptyState
            icon={LayoutTemplate}
            title="بلوکی نیست"
            description="اولین بلوک صفحه‌ی اصلی را بسازید."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-start text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                  <th className="px-4 py-3 font-medium">ترتیب</th>
                  <th className="px-4 py-3 font-medium">بلوک</th>
                  <th className="px-4 py-3 font-medium">زمان‌بندی</th>
                  <th className="px-4 py-3 font-medium">وضعیت</th>
                  <th className="px-4 py-3 font-medium">عملیات</th>
                </tr>
              </thead>
              {isPending ? (
                <TableSkeleton rows={5} cols={5} />
              ) : (
                <tbody className="divide-y divide-white/[0.04]">
                  {blocks.map((b, index) => (
                    <tr key={b.id}>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label="بالاتر"
                            disabled={index === 0 || reorder.isPending}
                            onClick={() => move(index, -1)}
                          >
                            <ArrowUp className="size-4" />
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label="پایین‌تر"
                            disabled={
                              index === blocks.length - 1 || reorder.isPending
                            }
                            onClick={() => move(index, 1)}
                          >
                            <ArrowDown className="size-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="m-0 font-semibold text-white">
                          {b.title || BLOCK_TYPE_LABELS[b.type]}
                        </p>
                        <p className="m-0 text-[11px] text-slate-500">
                          {BLOCK_TYPE_LABELS[b.type]}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-400">
                        {b.startsAt
                          ? `از ${formatJalaliDateTime(b.startsAt)}`
                          : "همیشه"}
                        {b.endsAt
                          ? ` تا ${formatJalaliDateTime(b.endsAt)}`
                          : ""}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggle.mutate(b)}
                          aria-label={b.isActive ? "غیرفعال کردن" : "فعال کردن"}
                        >
                          <Chip tone={b.isActive ? "success" : "neutral"}>
                            {b.isActive ? "فعال" : "غیرفعال"}
                          </Chip>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label="ویرایش بلوک"
                            onClick={() => setEditing(b)}
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            className="icon-btn hover:!text-danger"
                            aria-label="حذف بلوک"
                            onClick={() => setDeleteTarget(b)}
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
        title={editing === "new" ? "بلوک جدید" : "ویرایش بلوک"}
        widthClass="max-w-3xl"
      >
        {editing !== null && (
          <BlockForm
            block={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={deleteTarget !== null}
        title="حذف بلوک"
        description="این بلوک از صفحه‌ی اصلی حذف شود؟"
        confirmLabel="حذف"
        pending={remove.isPending}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
