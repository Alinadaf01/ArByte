import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Field, Input, Select, Switch } from "@/components/ui/Field";
import { JalaliDateInput } from "@/components/ui/JalaliDateInput";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import {
  getBalePaySettings,
  getBalePayWebhook,
  listBalePaySessions,
  registerBalePayWebhook,
  saveBalePaySettings,
  testBalePayConnection,
} from "@/lib/api";
import { formatJalaliDateTime, formatPrice } from "@/lib/formatters";
import { useQueryFilters } from "@/lib/useQueryFilters";
import { useToast } from "@/lib/ToastContext";
import type { BalePaySettings, BalePaySettingsInput } from "@/types/balepay";
import { BALE_SESSION_STATUS_LABELS } from "@/types/order";

const PAGE_SIZE = 20;

/**
 * AUDIT-3 §۷/§۸/§۱۸/§۱۹ — «بله پی». توکن‌ها هرگز از سرور برنمی‌گردند (فقط
 * ••••۱۲۳۴)؛ فیلد خالی یعنی همان مقدار قبلی بماند.
 */
export default function BalePayPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="بله پی"
        description="پرداخت آنلاین در اپلیکیشن «بله»: ربات، کیف‌پول پذیرنده، سقف پرداخت آنلاین و فعالیت پرداخت‌ها."
      />
      <SettingsCard />
      <SessionsCard />
    </div>
  );
}

function toInput(s: BalePaySettings): BalePaySettingsInput {
  return {
    enabled: s.enabled,
    sandbox: s.sandbox,
    botUsername: s.botUsername,
    botToken: "",
    providerToken: "",
    onlineLimitRial: s.onlineLimitRial,
  };
}

function SettingsCard() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: ["balepay-settings"],
    queryFn: getBalePaySettings,
  });
  const webhook = useQuery({
    queryKey: ["balepay-webhook"],
    queryFn: getBalePayWebhook,
  });
  const [draft, setDraft] = useState<BalePaySettingsInput | null>(null);

  useEffect(() => {
    if (settings.data) setDraft(toInput(settings.data));
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () => saveBalePaySettings(draft!),
    onSuccess: (data) => {
      queryClient.setQueryData(["balepay-settings"], data);
      toast.showSuccess("تنظیمات بله پی ذخیره شد.");
    },
    onError: (e: unknown) =>
      toast.showError(e instanceof Error ? e.message : "ذخیره ناموفق بود."),
  });
  const test = useMutation({ mutationFn: testBalePayConnection });
  const hook = useMutation({
    mutationFn: registerBalePayWebhook,
    onSuccess: (r) => {
      if (r.ok) toast.showSuccess("وب‌هوک ربات ثبت شد.");
      else toast.showError(r.error ?? "ثبت وب‌هوک ناموفق بود.");
      queryClient.invalidateQueries({ queryKey: ["balepay-webhook"] });
    },
  });

  if (settings.isError)
    return (
      <ErrorState
        description={settings.error.message}
        onRetry={() => settings.refetch()}
      />
    );
  if (!settings.data || !draft) return <Skeleton className="h-72 w-full" />;
  const s = settings.data;
  const set = (patch: Partial<BalePaySettingsInput>) =>
    setDraft({ ...draft, ...patch });

  return (
    <section className="glass-card flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-sm font-bold text-white">تنظیمات</h2>
        <Chip tone={s.ready ? "success" : "warning"}>
          {s.ready
            ? "آماده"
            : s.enabled
              ? "ناقص — توکن یا نام ربات"
              : "غیرفعال"}
        </Chip>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="فعال" htmlFor="bp-enabled">
          <Switch
            checked={draft.enabled}
            onChange={(v) => set({ enabled: v })}
            label="پرداخت آنلاین در چک‌اوت"
          />
        </Field>
        <Field label="حالت" htmlFor="bp-mode">
          <Select
            id="bp-mode"
            value={draft.sandbox ? "sandbox" : "live"}
            onChange={(e) => set({ sandbox: e.target.value === "sandbox" })}
          >
            <option value="live">واقعی (کیف‌پول پذیرنده)</option>
            <option value="sandbox">آزمایشی (کیف‌پول تست بله)</option>
          </Select>
        </Field>
        <Field label="نام کاربری ربات" htmlFor="bp-bot">
          <Input
            id="bp-bot"
            dir="ltr"
            placeholder="arbytebot"
            value={draft.botUsername}
            onChange={(e) => set({ botUsername: e.target.value })}
          />
        </Field>
        <Field label="سقف هر پرداخت آنلاین (ریال)" htmlFor="bp-limit">
          <Input
            id="bp-limit"
            dir="ltr"
            inputMode="numeric"
            value={String(draft.onlineLimitRial)}
            onChange={(e) =>
              set({
                onlineLimitRial: Number(e.target.value.replace(/\D/g, "")) || 0,
              })
            }
          />
          <span className="text-[11px] text-slate-500">
            = {formatPrice(Math.floor(draft.onlineLimitRial / 10))} · بالاتر از
            این، «پرداخت ترکیبی» پیشنهاد می‌شود.
          </span>
        </Field>
        <Field
          label={`توکن ربات ${s.botToken ?? "(ثبت نشده)"}`}
          htmlFor="bp-token"
        >
          <Input
            id="bp-token"
            dir="ltr"
            type="password"
            autoComplete="off"
            placeholder="خالی = بدون تغییر"
            value={draft.botToken}
            onChange={(e) => set({ botToken: e.target.value })}
          />
        </Field>
        <Field
          label={`توکن کیف‌پول پذیرنده ${s.providerToken ?? "(ثبت نشده)"}`}
          htmlFor="bp-provider"
        >
          <Input
            id="bp-provider"
            dir="ltr"
            type="password"
            autoComplete="off"
            placeholder="خالی = بدون تغییر"
            value={draft.providerToken}
            onChange={(e) => set({ providerToken: e.target.value })}
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "در حال ذخیره…" : "ذخیره‌ی تنظیمات"}
        </Button>
        <Button
          variant="secondary"
          disabled={test.isPending}
          onClick={() => test.mutate()}
        >
          {test.isPending ? "در حال تست…" : "تست اتصال"}
        </Button>
        <Button
          variant="secondary"
          disabled={hook.isPending || !s.botToken}
          onClick={() => hook.mutate()}
        >
          ثبت وب‌هوک
        </Button>
        <span className="text-[11px] text-slate-500">واحد: ریال (IRR)</span>
      </div>

      {test.data && (
        <p
          className={`m-0 text-sm ${test.data.ok ? "text-success" : "text-danger"}`}
        >
          {test.data.ok
            ? `متصل — ربات @${test.data.botUsername}${test.data.providerTokenSet ? "" : " · توکن کیف‌پول ثبت نشده"}`
            : test.data.error}
          {test.data.warning && (
            <span className="text-warning"> · {test.data.warning}</span>
          )}
        </p>
      )}
      {webhook.data && (
        <p className="m-0 text-xs text-slate-400">
          وب‌هوک:{" "}
          {webhook.data.ok
            ? webhook.data.registered
              ? "ثبت شده روی همین سرور"
              : "ثبت نشده — «ثبت وب‌هوک» را بزنید"
            : webhook.data.error}
          {webhook.data.lastError && (
            <span className="text-danger">
              {" "}
              · آخرین خطا: {webhook.data.lastError}
            </span>
          )}
        </p>
      )}
    </section>
  );
}

function SessionsCard() {
  const [filters, setFilters] = useQueryFilters({
    page: "1",
    status: "",
    order: "",
    dateFrom: "",
    dateTo: "",
    amountMin: "",
    amountMax: "",
  });
  const page = Number(filters.page) || 1;
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["balepay-sessions", filters],
    queryFn: () =>
      listBalePaySessions({ ...filters, page, pageSize: PAGE_SIZE }),
  });
  const update = (patch: Partial<typeof filters>) =>
    setFilters({ ...patch, page: "1" });

  return (
    <section className="glass-card flex flex-col gap-4 p-6">
      <h2 className="m-0 text-sm font-bold text-white">فعالیت پرداخت‌ها</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Select
          aria-label="وضعیت"
          value={filters.status}
          onChange={(e) => update({ status: e.target.value })}
        >
          <option value="">همه‌ی وضعیت‌ها</option>
          {Object.entries(BALE_SESSION_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Input
          aria-label="شماره سفارش"
          placeholder="شماره سفارش"
          dir="ltr"
          value={filters.order}
          onChange={(e) => update({ order: e.target.value })}
        />
        <JalaliDateInput
          label="از تاریخ"
          value={filters.dateFrom}
          onChange={(v) => update({ dateFrom: v })}
        />
        <JalaliDateInput
          label="تا تاریخ"
          value={filters.dateTo}
          onChange={(v) => update({ dateTo: v })}
        />
        <Input
          aria-label="حداقل مبلغ (تومان)"
          placeholder="حداقل مبلغ (تومان)"
          inputMode="numeric"
          value={filters.amountMin}
          onChange={(e) =>
            update({ amountMin: e.target.value.replace(/\D/g, "") })
          }
        />
        <Input
          aria-label="حداکثر مبلغ (تومان)"
          placeholder="حداکثر مبلغ (تومان)"
          inputMode="numeric"
          value={filters.amountMax}
          onChange={(e) =>
            update({ amountMax: e.target.value.replace(/\D/g, "") })
          }
        />
      </div>

      {isError ? (
        <ErrorState
          description="دریافت پرداخت‌ها ناموفق بود."
          onRetry={() => refetch()}
        />
      ) : isPending ? (
        <table className="w-full">
          <TableSkeleton rows={5} />
        </table>
      ) : data.results.length === 0 ? (
        <EmptyState title="پرداختی ثبت نشده است." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="text-start text-[11px] text-slate-500">
                  {[
                    "سفارش",
                    "مشتری",
                    "مبلغ",
                    "مرجع فاکتور",
                    "شناسه‌ی پرداخت",
                    "وضعیت",
                    "ایجاد",
                    "پرداخت",
                    "خطا",
                  ].map((h) => (
                    <th key={h} className="px-3 py-2 text-start font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.results.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-white/[0.05] text-slate-200"
                  >
                    <td className="px-3 py-2" dir="ltr">
                      <Link
                        to={`/orders/${row.orderId}`}
                        className="text-brand-300 underline"
                      >
                        {row.orderNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2" dir="ltr">
                      {row.customerPhone ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {formatPrice(row.amount)}
                      <span
                        className="block text-[11px] text-slate-500"
                        dir="ltr"
                      >
                        {row.amountRial.toLocaleString("en-US")} {row.currency}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px]" dir="ltr">
                      {row.reference.slice(0, 12)}…
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px]" dir="ltr">
                      {row.providerPaymentChargeId ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <Chip
                        tone={
                          row.status === "PAID"
                            ? "success"
                            : row.status === "NEEDS_REVIEW" ||
                                row.status === "FAILED"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {BALE_SESSION_STATUS_LABELS[row.status] ?? row.status}
                      </Chip>
                    </td>
                    <td className="px-3 py-2 text-[11px]">
                      {formatJalaliDateTime(row.createdAt)}
                    </td>
                    <td className="px-3 py-2 text-[11px]">
                      {row.paidAt ? formatJalaliDateTime(row.paidAt) : "—"}
                    </td>
                    <td className="max-w-[220px] px-3 py-2 text-[11px] text-danger">
                      {row.failureReason || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            count={data.count}
            onPageChange={(p) => setFilters({ page: String(p) })}
          />
        </>
      )}
    </section>
  );
}
