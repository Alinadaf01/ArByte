import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, TicketPercent, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Switch } from "@/components/ui/Field";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  createCoupon,
  deleteCoupon,
  listCoupons,
  updateCoupon,
} from "@/lib/api";
import { formatJalaliDate, formatPrice } from "@/lib/formatters";
import { useToast } from "@/lib/ToastContext";
import type { AdminCoupon, CouponFormValues, CouponType } from "@/types/coupon";

const PAGE_SIZE = 20;
const toLocal = (iso: string | null) =>
  iso
    ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);
const num = (v: string) => (v === "" ? null : Number(v));

const EMPTY: CouponFormValues = {
  code: "",
  type: "PERCENT",
  amountToman: null,
  percentBasisPoints: 1000,
  minimumOrderAmount: null,
  maximumDiscountAmount: null,
  usageLimit: null,
  perUserLimit: 1,
  startDate: null,
  endDate: null,
  isActive: true,
};

function discountLabel(
  c: Pick<AdminCoupon, "type" | "amountToman" | "percentBasisPoints">,
) {
  return c.type === "PERCENT"
    ? `${((c.percentBasisPoints ?? 0) / 100).toLocaleString("fa-IR")}٪`
    : formatPrice(c.amountToman ?? 0);
}

function CouponForm({
  coupon,
  onClose,
}: {
  coupon: AdminCoupon | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [draft, setDraft] = useState<CouponFormValues>(
    coupon ? { ...coupon } : EMPTY,
  );
  const set = <K extends keyof CouponFormValues>(
    key: K,
    value: CouponFormValues[K],
  ) => setDraft((d) => ({ ...d, [key]: value }));
  const save = useMutation({
    mutationFn: () =>
      coupon ? updateCoupon(coupon.id, draft) : createCoupon(draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      toast.showSuccess("کوپن ذخیره شد.");
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
        <Field label="کد" htmlFor="cp-code" hint="با حروف بزرگ ذخیره می‌شود.">
          <Input
            id="cp-code"
            dir="ltr"
            required
            value={draft.code}
            onChange={(e) => set("code", e.target.value)}
          />
        </Field>
        <Field label="نوع" htmlFor="cp-type">
          <Select
            id="cp-type"
            value={draft.type}
            onChange={(e) => set("type", e.target.value as CouponType)}
          >
            <option value="PERCENT">درصدی</option>
            <option value="AMOUNT">مبلغ ثابت</option>
          </Select>
        </Field>
        {draft.type === "PERCENT" ? (
          <Field label="درصد تخفیف" htmlFor="cp-percent">
            <Input
              id="cp-percent"
              type="number"
              min={0.01}
              max={100}
              step="0.01"
              value={(draft.percentBasisPoints ?? 0) / 100}
              onChange={(e) =>
                set(
                  "percentBasisPoints",
                  Math.round(Number(e.target.value) * 100),
                )
              }
            />
          </Field>
        ) : (
          <Field label="مبلغ تخفیف (تومان)" htmlFor="cp-amount">
            <Input
              id="cp-amount"
              type="number"
              min={1}
              value={draft.amountToman ?? ""}
              onChange={(e) => set("amountToman", num(e.target.value))}
            />
          </Field>
        )}
        <Field
          label="سقف تخفیف (تومان)"
          htmlFor="cp-max"
          hint="خالی = بدون سقف"
        >
          <Input
            id="cp-max"
            type="number"
            min={0}
            value={draft.maximumDiscountAmount ?? ""}
            onChange={(e) => set("maximumDiscountAmount", num(e.target.value))}
          />
        </Field>
        <Field label="حداقل مبلغ سفارش (تومان)" htmlFor="cp-min">
          <Input
            id="cp-min"
            type="number"
            min={0}
            value={draft.minimumOrderAmount ?? ""}
            onChange={(e) => set("minimumOrderAmount", num(e.target.value))}
          />
        </Field>
        <Field
          label="محدودیت کل استفاده"
          htmlFor="cp-limit"
          hint="خالی = نامحدود"
        >
          <Input
            id="cp-limit"
            type="number"
            min={1}
            value={draft.usageLimit ?? ""}
            onChange={(e) => set("usageLimit", num(e.target.value))}
          />
        </Field>
        <Field
          label="محدودیت هر کاربر"
          htmlFor="cp-per-user"
          hint="خالی = نامحدود"
        >
          <Input
            id="cp-per-user"
            type="number"
            min={1}
            value={draft.perUserLimit ?? ""}
            onChange={(e) => set("perUserLimit", num(e.target.value))}
          />
        </Field>
        <div />
        <Field label="شروع" htmlFor="cp-start">
          <Input
            id="cp-start"
            type="datetime-local"
            value={toLocal(draft.startDate)}
            onChange={(e) => set("startDate", fromLocal(e.target.value))}
          />
        </Field>
        <Field label="پایان" htmlFor="cp-end">
          <Input
            id="cp-end"
            type="datetime-local"
            value={toLocal(draft.endDate)}
            onChange={(e) => set("endDate", fromLocal(e.target.value))}
          />
        </Field>
      </div>
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
          ذخیره
        </Button>
      </div>
    </form>
  );
}

export default function CouponsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminCoupon | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCoupon | null>(null);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["coupons", page],
    queryFn: () => listCoupons({ page, pageSize: PAGE_SIZE }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteCoupon(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coupons"] }),
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "حذف ناموفق بود.",
      ),
    onSettled: () => setDeleteTarget(null),
  });
  const coupons = data?.results ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="کدهای تخفیف"
        description="کوپن درصدی یا مبلغی با سقف، حداقل سفارش، محدودیت کل و هر کاربر، و بازه‌ی زمانی."
        actions={<Button onClick={() => setEditing("new")}>+ کوپن جدید</Button>}
      />
      <section className="glass-card overflow-hidden p-0">
        {isError ? (
          <ErrorState
            description="دریافت کوپن‌ها ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && coupons.length === 0 ? (
          <EmptyState
            icon={TicketPercent}
            title="کوپنی نیست"
            description="اولین کد تخفیف را بسازید."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-start text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                    <th className="px-6 py-3 font-medium">کد</th>
                    <th className="px-4 py-3 font-medium">تخفیف</th>
                    <th className="px-4 py-3 font-medium">شرایط</th>
                    <th className="px-4 py-3 font-medium">استفاده</th>
                    <th className="px-4 py-3 font-medium">بازه</th>
                    <th className="px-4 py-3 font-medium">وضعیت</th>
                    <th className="px-4 py-3 font-medium">عملیات</th>
                  </tr>
                </thead>
                {isPending ? (
                  <TableSkeleton rows={5} cols={7} />
                ) : (
                  <tbody className="divide-y divide-white/[0.04]">
                    {coupons.map((c) => (
                      <tr key={c.id}>
                        <td
                          className="px-6 py-3 font-mono font-bold text-brand-300"
                          dir="ltr"
                        >
                          {c.code}
                        </td>
                        <td className="px-4 py-3 text-white">
                          {discountLabel(c)}
                          {c.maximumDiscountAmount ? (
                            <span className="block text-[11px] text-slate-500">
                              سقف {formatPrice(c.maximumDiscountAmount)}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-400">
                          {c.minimumOrderAmount
                            ? `حداقل ${formatPrice(c.minimumOrderAmount)}`
                            : "بدون حداقل"}
                          <br />
                          {c.perUserLimit
                            ? `هر کاربر ${c.perUserLimit.toLocaleString("fa-IR")} بار`
                            : "هر کاربر نامحدود"}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-300">
                          {c.usedCount.toLocaleString("fa-IR")}
                          {c.usageLimit
                            ? ` از ${c.usageLimit.toLocaleString("fa-IR")}`
                            : ""}{" "}
                          بار · {c.uniqueUsers.toLocaleString("fa-IR")} کاربر
                          <span className="block text-slate-500">
                            جمع تخفیف: {formatPrice(c.totalDiscount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-400">
                          {c.startDate ? formatJalaliDate(c.startDate) : "—"} تا{" "}
                          {c.endDate ? formatJalaliDate(c.endDate) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Chip tone={c.isActive ? "success" : "neutral"}>
                            {c.isActive ? "فعال" : "غیرفعال"}
                          </Chip>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              className="icon-btn"
                              aria-label={`ویرایش ${c.code}`}
                              onClick={() => setEditing(c)}
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              className="icon-btn hover:!text-danger"
                              aria-label={`حذف ${c.code}`}
                              onClick={() => setDeleteTarget(c)}
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
            {data && (
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                count={data.count}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </section>
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "کوپن جدید" : "ویرایش کوپن"}
        widthClass="max-w-2xl"
      >
        {editing !== null && (
          <CouponForm
            coupon={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={deleteTarget !== null}
        title="حذف کوپن"
        description={`کوپن «${deleteTarget?.code}» حذف شود؟`}
        confirmLabel="حذف"
        pending={remove.isPending}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
