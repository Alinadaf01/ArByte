import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Megaphone, Pencil, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Switch } from "@/components/ui/Field";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { ProductSearchSelect } from "@/components/ui/ProductSearchSelect";
import {
  deleteCampaign,
  listCampaigns,
  listCategories,
  previewCampaign,
  saveCampaign,
  type CampaignBody,
} from "@/lib/catalogApi";
import { formatJalaliDateTime, formatPrice } from "@/lib/formatters";
import { useToast } from "@/lib/ToastContext";
import { cn } from "@/lib/cn";
import type { Campaign } from "@/types/catalog";

const STATE: Record<
  Campaign["state"],
  { label: string; tone: "success" | "brand" | "neutral" }
> = {
  running: { label: "در حال اجرا", tone: "success" },
  scheduled: { label: "زمان‌بندی‌شده", tone: "brand" },
  ended: { label: "پایان‌یافته", tone: "neutral" },
  inactive: { label: "غیرفعال", tone: "neutral" },
};
const toLocal = (iso: string) =>
  new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

function CampaignForm({
  campaign,
  onClose,
}: {
  campaign: Campaign | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(),
  });
  const now = new Date();
  const [name, setName] = useState(campaign?.name ?? "");
  const [startAt, setStartAt] = useState(
    toLocal(campaign?.startAt ?? now.toISOString()),
  );
  const [endAt, setEndAt] = useState(
    toLocal(
      campaign?.endAt ?? new Date(now.getTime() + 7 * 86400000).toISOString(),
    ),
  );
  const [discountType, setDiscountType] = useState<"PERCENT" | "AMOUNT">(
    campaign?.rules?.discountType ?? "PERCENT",
  );
  const [value, setValue] = useState(campaign?.rules?.value ?? 10);
  const [priority, setPriority] = useState(campaign?.priority ?? 0);
  const [isActive, setIsActive] = useState(campaign?.isActive ?? true);
  const [products, setProducts] = useState(campaign?.products ?? []);
  const [categoryIds, setCategoryIds] = useState<string[]>(
    campaign?.categories.map((c) => c.id) ?? [],
  );
  const save = useMutation({
    mutationFn: () => {
      const body: CampaignBody = {
        name,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        isActive,
        priority,
        discountType,
        value,
        productIds: products.map((p) => Number(p.id)),
        categoryIds: categoryIds.map(Number),
      };
      return saveCampaign(campaign?.id ?? null, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.showSuccess("کمپین ذخیره شد.");
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
        <Field label="نام" htmlFor="cmp-name">
          <Input
            id="cmp-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field
          label="اولویت"
          htmlFor="cmp-priority"
          hint="اگر چند کمپین هم‌زمان روی یک کالا باشند، بالاتر برنده است."
        >
          <Input
            id="cmp-priority"
            type="number"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
          />
        </Field>
        <Field label="شروع" htmlFor="cmp-start">
          <Input
            id="cmp-start"
            type="datetime-local"
            required
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
          />
        </Field>
        <Field label="پایان" htmlFor="cmp-end">
          <Input
            id="cmp-end"
            type="datetime-local"
            required
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
          />
        </Field>
        <Field label="نوع تخفیف" htmlFor="cmp-type">
          <Select
            id="cmp-type"
            value={discountType}
            onChange={(e) =>
              setDiscountType(e.target.value as "PERCENT" | "AMOUNT")
            }
          >
            <option value="PERCENT">درصد</option>
            <option value="AMOUNT">مبلغ (تومان)</option>
          </Select>
        </Field>
        <Field
          label={discountType === "PERCENT" ? "درصد تخفیف" : "مبلغ تخفیف"}
          htmlFor="cmp-value"
        >
          <Input
            id="cmp-value"
            type="number"
            min={1}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
          />
        </Field>
      </div>
      <Field
        label="دسته‌ها (همه‌ی کالاهای دسته و زیردسته‌ها)"
        htmlFor="cmp-cats"
      >
        <div id="cmp-cats" className="flex flex-wrap gap-2">
          {categories?.results.map((c) => {
            const on = categoryIds.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  setCategoryIds((ids) =>
                    on ? ids.filter((i) => i !== c.id) : [...ids, c.id],
                  )
                }
                className={cn(
                  "rounded-full border px-3 py-1 text-xs",
                  on
                    ? "border-brand-500 bg-brand-500/15 text-brand-200"
                    : "border-white/10 text-slate-400",
                )}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="محصولات" htmlFor="cmp-products">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {products.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-200"
              >
                {p.name}
                <button
                  type="button"
                  aria-label={`حذف ${p.name}`}
                  onClick={() =>
                    setProducts((all) => all.filter((x) => x.id !== p.id))
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
              !products.some((x) => x.id === p.id) &&
              setProducts((all) => [
                ...all,
                { id: p.id, name: p.name, slug: p.slug },
              ])
            }
          />
        </div>
      </Field>
      <Switch checked={isActive} onChange={setIsActive} label="فعال" />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          انصراف
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={save.isPending || (!products.length && !categoryIds.length)}
        >
          ذخیره
        </Button>
      </div>
    </form>
  );
}

function PreviewModal({
  campaign,
  onClose,
}: {
  campaign: Campaign;
  onClose: () => void;
}) {
  const { data, isPending } = useQuery({
    queryKey: ["campaign-preview", campaign.id],
    queryFn: () => previewCampaign(campaign.id),
  });
  return (
    <Modal
      open
      onClose={onClose}
      title={`قیمت‌ها در «${campaign.name}»`}
      widthClass="max-w-2xl"
    >
      {isPending ? (
        <p className="text-xs text-slate-500">در حال محاسبه…</p>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-start text-sm">
            <tbody className="divide-y divide-white/[0.04]">
              {data?.rows.map((r) => (
                <tr key={r.variant}>
                  <td className="py-2 text-white">
                    {r.productName}{" "}
                    <span
                      dir="ltr"
                      className="font-mono text-[11px] text-slate-500"
                    >
                      {r.sku}
                    </span>
                  </td>
                  <td className="py-2 text-slate-500 line-through">
                    {formatPrice(r.price)}
                  </td>
                  <td className="py-2 font-bold text-white">
                    {formatPrice(r.campaignPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.rows.length === 0 && (
            <p className="text-xs text-slate-500">کالایی زیر این کمپین نیست.</p>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<Campaign | "new" | null>(null);
  const [previewing, setPreviewing] = useState<Campaign | null>(null);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["campaigns"],
    queryFn: listCampaigns,
  });
  const remove = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "حذف ناموفق بود.",
      ),
  });
  const campaigns = data?.results ?? [];
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="کمپین‌ها"
        description="تخفیف زمان‌دار روی محصول یا دسته؛ در بازه‌ی فعال، قیمت سایت، سبد و سفارش خودکار با قیمت کمپین است و قیمت قبلی خط‌خورده نمایش داده می‌شود."
        actions={
          <Button onClick={() => setEditing("new")}>+ کمپین جدید</Button>
        }
      />
      <section className="glass-card overflow-x-auto p-0">
        {isError ? (
          <ErrorState
            description="دریافت کمپین‌ها ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && campaigns.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="کمپینی نیست"
            description="اولین کمپین را بسازید."
          />
        ) : (
          <table className="w-full min-w-[46rem] text-start text-sm">
            <tbody className="divide-y divide-white/[0.04]">
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td className="px-6 py-3">
                    <p className="m-0 font-semibold text-white">{c.name}</p>
                    <p className="m-0 text-[11px] text-slate-500">
                      {[
                        ...c.categories.map((x) => x.name),
                        ...c.products.map((x) => x.name),
                      ].join("، ") || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-white">
                    {c.rules?.discountType === "PERCENT"
                      ? `${c.rules.value.toLocaleString("fa-IR")}٪`
                      : formatPrice(c.rules?.value ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-400">
                    {formatJalaliDateTime(c.startAt)} تا{" "}
                    {formatJalaliDateTime(c.endAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Chip tone={STATE[c.state].tone}>
                      {STATE[c.state].label}
                    </Chip>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="پیش‌نمایش قیمت‌ها"
                        onClick={() => setPreviewing(c)}
                      >
                        <Eye className="size-4" />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="ویرایش"
                        onClick={() => setEditing(c)}
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        className="icon-btn hover:!text-danger"
                        aria-label="حذف"
                        onClick={() => remove.mutate(c.id)}
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
      </section>
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "کمپین جدید" : "ویرایش کمپین"}
        widthClass="max-w-3xl"
      >
        {editing !== null && (
          <CampaignForm
            campaign={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>
      {previewing && (
        <PreviewModal
          campaign={previewing}
          onClose={() => setPreviewing(null)}
        />
      )}
    </div>
  );
}
