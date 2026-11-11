import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Megaphone, Send } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { Pagination } from "@/components/ui/Pagination";
import {
  getMarketingUserCart,
  listMarketingAudience,
  sendMarketingCampaign,
} from "@/lib/api";
import { formatPrice, formatJalaliDateTime } from "@/lib/formatters";
import { useToast } from "@/lib/ToastContext";
import { useQueryFilters } from "@/lib/useQueryFilters";
import type { MarketingUserCart } from "@/types/marketing";

const PAGE_SIZE = 20;

function CartRow({ userId }: { userId: string }) {
  const { data, isPending, isError } = useQuery<MarketingUserCart>({
    queryKey: ["marketing-user-cart", userId],
    queryFn: () => getMarketingUserCart(userId),
  });

  if (isPending)
    return (
      <tr>
        <td colSpan={6} className="px-6 py-3 text-xs text-slate-500">
          در حال بارگذاری سبد خرید…
        </td>
      </tr>
    );
  if (isError || !data)
    return (
      <tr>
        <td colSpan={6} className="px-6 py-3 text-xs text-danger">
          دریافت سبد خرید ناموفق بود.
        </td>
      </tr>
    );
  if (data.items.length === 0)
    return (
      <tr>
        <td
          colSpan={6}
          className="bg-ink-800/40 px-6 py-3 text-xs text-slate-500"
        >
          سبد خرید خالی است — چیزی اضافه نکرده.
        </td>
      </tr>
    );

  return (
    <tr>
      <td colSpan={6} className="bg-ink-800/40 px-6 py-3">
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-xs">
          {data.items.map((item, i) => (
            <li key={i} className="flex items-center justify-between gap-3">
              <span className="text-slate-300">
                {item.productName}
                {item.variantLabel ? (
                  <span className="text-slate-500"> · {item.variantLabel}</span>
                ) : null}
                <span className="text-slate-500">
                  {" "}
                  × {item.quantity.toLocaleString("fa-IR")}
                </span>
              </span>
              <span className="font-mono text-slate-400" dir="ltr">
                {item.sku}
              </span>
              <span className="font-semibold text-white">
                {formatPrice(item.unitPrice)}
              </span>
            </li>
          ))}
        </ul>
        {data.updatedAt && (
          <p className="m-0 mt-2 text-[11px] text-slate-500">
            آخرین تغییر سبد: {formatJalaliDateTime(data.updatedAt)}
          </p>
        )}
      </td>
    </tr>
  );
}

export default function MarketingPage() {
  const toast = useToast();
  const [filters, setFilters] = useQueryFilters({ page: "1", search: "" });
  const page = Number(filters.page) || 1;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["marketing-audience", filters],
    queryFn: () =>
      listMarketingAudience({
        page,
        pageSize: PAGE_SIZE,
        search: filters.search || undefined,
      }),
  });
  const users = data?.results ?? [];

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    setSelected((prev) => {
      const allSelected = users.every((u) => prev.has(u.id));
      const next = new Set(prev);
      for (const u of users) {
        if (allSelected) next.delete(u.id);
        else next.add(u.id);
      }
      return next;
    });
  }

  async function send() {
    if (selected.size === 0 || !message.trim()) return;
    setSending(true);
    try {
      const result = await sendMarketingCampaign(
        Array.from(selected),
        message.trim(),
      );
      toast.showSuccess(
        `پیامک برای ${result.queued.toLocaleString("fa-IR")} از ${result.matched.toLocaleString("fa-IR")} کاربر در صف ارسال قرار گرفت.`,
      );
      setSelected(new Set());
      setMessage("");
    } catch (error) {
      toast.showError(
        error instanceof Error ? error.message : "ارسال کمپین ناموفق بود.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="بازاریابی پیامکی"
        description="کاربرانی که ثبت‌نام کرده‌اند ولی هنوز خریدی نداشته‌اند — متن دلخواه (مثلاً کد تخفیف) با کاوه‌نگار برایشان بفرست و سبد خریدشان را ببین تا بفهمی چرا نخریده‌اند."
      />

      <section className="glass-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-6 py-4">
          <Input
            className="w-64"
            placeholder="جست‌وجوی موبایل یا نام…"
            defaultValue={filters.search}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                setFilters({
                  search: (e.target as HTMLInputElement).value,
                  page: "1",
                });
            }}
            onBlur={(e) => setFilters({ search: e.target.value, page: "1" })}
          />
          <span className="text-xs text-slate-400">
            {selected.size.toLocaleString("fa-IR")} کاربر انتخاب شده
          </span>
        </div>

        {isError ? (
          <ErrorState
            description="دریافت فهرست مخاطبان ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && users.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="مخاطبی یافت نشد"
            description="همه‌ی کاربران ثبت‌نام‌کرده حداقل یک سفارش دارند."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-start text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                    <th className="px-6 py-3 font-medium">
                      <input
                        type="checkbox"
                        aria-label="انتخاب همه"
                        checked={
                          users.length > 0 &&
                          users.every((u) => selected.has(u.id))
                        }
                        onChange={toggleSelectAllOnPage}
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">موبایل</th>
                    <th className="px-4 py-3 font-medium">نام</th>
                    <th className="px-4 py-3 font-medium">تاریخ ثبت‌نام</th>
                    <th className="px-4 py-3 font-medium">سبد خرید</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                {isPending ? (
                  <TableSkeleton rows={6} cols={6} />
                ) : (
                  <tbody className="divide-y divide-white/[0.04]">
                    {users.map((u) => (
                      <Fragment key={u.id}>
                        <tr>
                          <td className="px-6 py-3">
                            <input
                              type="checkbox"
                              aria-label={`انتخاب ${u.phone}`}
                              checked={selected.has(u.id)}
                              onChange={() => toggleSelected(u.id)}
                            />
                          </td>
                          <td
                            className="px-4 py-3 font-mono text-slate-300"
                            dir="ltr"
                          >
                            {u.phone}
                          </td>
                          <td className="px-4 py-3 text-slate-400">
                            {[u.firstName, u.lastName]
                              .filter(Boolean)
                              .join(" ") || "—"}
                          </td>
                          <td className="px-4 py-3 text-[11px] text-slate-500">
                            {formatJalaliDateTime(u.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-slate-400">
                            {u.cartItemCount > 0
                              ? `${u.cartItemCount.toLocaleString("fa-IR")} قلم`
                              : "خالی"}
                          </td>
                          <td className="px-4 py-3">
                            {u.cartItemCount > 0 && (
                              <button
                                type="button"
                                className="icon-btn"
                                aria-label="نمایش سبد خرید"
                                onClick={() => toggleExpanded(u.id)}
                              >
                                {expanded.has(u.id) ? (
                                  <ChevronUp className="size-4" />
                                ) : (
                                  <ChevronDown className="size-4" />
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                        {expanded.has(u.id) && <CartRow userId={u.id} />}
                      </Fragment>
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
                onPageChange={(p) => setFilters({ page: String(p) })}
              />
            )}
          </>
        )}
      </section>

      <section className="glass-card flex flex-col gap-4 p-6">
        <h2 className="m-0 text-sm font-bold text-white">ارسال پیامک</h2>
        <Field
          label="متن پیامک"
          hint={`${message.length.toLocaleString("fa-IR")} کاراکتر`}
        >
          <Textarea
            placeholder="مثلاً: سلام! دستگاهی که توی سبدتون بود هنوز موجوده. با کد TAKHFIF10 یک تخفیف ویژه برات در نظر گرفتیم."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </Field>
        <div className="flex justify-end">
          <Button
            disabled={selected.size === 0 || !message.trim() || sending}
            onClick={send}
          >
            <Send className="size-4" strokeWidth={1.8} />
            {sending
              ? "در حال ارسال…"
              : `ارسال به ${selected.size.toLocaleString("fa-IR")} کاربر`}
          </Button>
        </div>
      </section>
    </div>
  );
}
