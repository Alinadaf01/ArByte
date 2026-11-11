import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/Field";
import {
  createManualOrder,
  searchOrderVariants,
  type OrderVariantSearchRow,
} from "@/lib/api";
import { formatPrice } from "@/lib/formatters";
import { useToast } from "@/lib/ToastContext";
import { PAYMENT_PLAN_LABELS, type PaymentPlan } from "@/types/order";

interface OrderLine {
  variant: OrderVariantSearchRow;
  quantity: number;
}

interface DiscountLineForm {
  key: number;
  label: string;
  amount: string;
}

/**
 * برای سفارش‌هایی که در واتس‌اپ/تلفن نهایی شده‌اند — ثبت مستقیم از پنل،
 * بدون نیاز به ایمپرسونیت/چک‌اوت مشتری (که عمداً برای جلوگیری از سوءاستفاده
 * مسدود است، ر.ک. apps/users/permissions.py's IsNotImpersonating).
 */
export default function ManualOrderPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [mobile, setMobile] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [shippingProvince, setShippingProvince] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingAddressLine, setShippingAddressLine] = useState("");
  const [shippingPostalCode, setShippingPostalCode] = useState("");
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>("BANK_TRANSFER");
  const [markPaid, setMarkPaid] = useState(false);

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<OrderVariantSearchRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [discountLines, setDiscountLines] = useState<DiscountLineForm[]>([]);
  // useRef نه useState — کلید باید همان لحظه (قبل از رندر بعدی) یکتا شود؛
  // دو کلیک سریع روی «افزودن» با useState closure بسته‌ی هر دو handler را
  // روی همان nextDiscountKey قدیمی می‌دید و دو ردیف هم‌کلید می‌ساخت که
  // ویرایش هرکدام، دیگری را هم تغییر می‌داد (کلید تکراری در map/patch).
  const nextDiscountKeyRef = useRef(1);

  async function runSearch() {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      setResults(await searchOrderVariants(search.trim()));
    } catch (error) {
      toast.showError(
        error instanceof Error ? error.message : "جست‌وجوی محصول ناموفق بود.",
      );
    } finally {
      setSearching(false);
    }
  }

  function addLine(variant: OrderVariantSearchRow) {
    setLines((prev) => {
      if (prev.some((l) => l.variant.id === variant.id)) return prev;
      return [...prev, { variant, quantity: 1 }];
    });
    setResults([]);
    setSearch("");
  }

  function setQuantity(variantId: string, quantity: number) {
    setLines((prev) =>
      prev.map((l) =>
        l.variant.id === variantId
          ? { ...l, quantity: Math.max(1, quantity) }
          : l,
      ),
    );
  }

  function removeLine(variantId: string) {
    setLines((prev) => prev.filter((l) => l.variant.id !== variantId));
  }

  function addDiscountLine() {
    const key = nextDiscountKeyRef.current++;
    setDiscountLines((prev) => [...prev, { key, label: "", amount: "" }]);
  }

  function patchDiscountLine(
    key: number,
    field: "label" | "amount",
    value: string,
  ) {
    setDiscountLines((prev) =>
      prev.map((d) => (d.key === key ? { ...d, [field]: value } : d)),
    );
  }

  function removeDiscountLine(key: number) {
    setDiscountLines((prev) => prev.filter((d) => d.key !== key));
  }

  const subtotal = lines.reduce(
    (sum, l) => sum + l.variant.finalPrice * l.quantity,
    0,
  );
  const discountTotal = discountLines.reduce(
    (sum, d) => sum + (Number(d.amount) || 0),
    0,
  );
  const total = Math.max(subtotal - discountTotal, 0);

  const mutation = useMutation({
    mutationFn: () =>
      createManualOrder({
        mobile,
        recipientName,
        shippingProvince,
        shippingCity,
        shippingAddressLine,
        shippingPostalCode: shippingPostalCode || undefined,
        items: lines.map((l) => ({
          variantId: l.variant.id,
          quantity: l.quantity,
        })),
        paymentPlan,
        markPaid,
        discountLines: discountLines
          .filter((d) => d.label.trim() && Number(d.amount) > 0)
          .map((d) => ({ label: d.label.trim(), amount: Number(d.amount) })),
      }),
    onSuccess: (order) => {
      toast.showSuccess("سفارش ثبت شد.");
      navigate(`/orders/${order.id}`);
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "ثبت سفارش ناموفق بود.",
      ),
  });

  const hasInvalidDiscountLine = discountLines.some(
    (d) => !d.label.trim() || !(Number(d.amount) > 0),
  );

  const canSubmit =
    /^09\d{9}$/.test(mobile) &&
    recipientName.trim() &&
    shippingProvince.trim() &&
    shippingCity.trim() &&
    shippingAddressLine.trim() &&
    lines.length > 0 &&
    !hasInvalidDiscountLine &&
    discountTotal <= subtotal;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="ثبت سفارش دستی"
        description="برای سفارش‌هایی که در واتس‌اپ/تلفن با مشتری نهایی شده — بدون نیاز به ورود مشتری به سایت."
      />

      <section className="glass-card flex flex-col gap-4 p-6">
        <h2 className="m-0 text-sm font-bold text-white">مشتری و تحویل</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="موبایل مشتری" required>
            <Input
              dir="ltr"
              placeholder="09xxxxxxxxx"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.trim())}
            />
          </Field>
          <Field label="نام گیرنده" required>
            <Input
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
          </Field>
          <Field label="استان" required>
            <Input
              value={shippingProvince}
              onChange={(e) => setShippingProvince(e.target.value)}
            />
          </Field>
          <Field label="شهر" required>
            <Input
              value={shippingCity}
              onChange={(e) => setShippingCity(e.target.value)}
            />
          </Field>
          <Field label="کد پستی" hint="اختیاری">
            <Input
              dir="ltr"
              value={shippingPostalCode}
              onChange={(e) => setShippingPostalCode(e.target.value)}
            />
          </Field>
        </div>
        <Field label="نشانی کامل" required>
          <Textarea
            value={shippingAddressLine}
            onChange={(e) => setShippingAddressLine(e.target.value)}
          />
        </Field>
      </section>

      <section className="glass-card flex flex-col gap-4 p-6">
        <h2 className="m-0 text-sm font-bold text-white">اقلام سفارش</h2>
        <div className="flex gap-2">
          <Input
            placeholder="جست‌وجوی محصول با نام یا SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={searching}
            onClick={runSearch}
          >
            {searching ? "در حال جست‌وجو…" : "جست‌وجو"}
          </Button>
        </div>

        {results.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-1.5 rounded-xl border border-white/[0.06] bg-ink-800/40 p-2">
            {results.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => addLine(row)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start text-sm text-slate-200 hover:bg-white/[0.04]"
                >
                  <span className="min-w-0 truncate">
                    {row.productName}
                    {row.name ? (
                      <span className="text-slate-400"> · {row.name}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {formatPrice(row.finalPrice)} · موجودی{" "}
                    {row.available.toLocaleString("fa-IR")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {lines.length === 0 ? (
          <p className="m-0 text-xs text-slate-500">
            هنوز قلمی اضافه نشده — از جست‌وجوی بالا محصول را انتخاب کنید.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {lines.map((line) => (
              <li
                key={line.variant.id}
                className="grid grid-cols-1 items-center gap-2 rounded-xl border border-white/[0.06] bg-ink-800/40 px-3.5 py-3 sm:grid-cols-[1fr_7rem_8rem_auto]"
              >
                <div className="min-w-0">
                  <p className="m-0 truncate text-sm text-white">
                    {line.variant.productName}
                    {line.variant.name ? (
                      <span className="text-slate-400">
                        {" "}
                        · {line.variant.name}
                      </span>
                    ) : null}
                  </p>
                  <p className="m-0 text-[11px] text-slate-500" dir="ltr">
                    {line.variant.sku} · موجودی{" "}
                    {line.variant.available.toLocaleString("fa-IR")}
                  </p>
                </div>
                <Input
                  type="number"
                  min={1}
                  dir="ltr"
                  value={line.quantity}
                  onChange={(e) =>
                    setQuantity(line.variant.id, Number(e.target.value))
                  }
                />
                <span className="text-sm font-semibold text-white">
                  {formatPrice(line.variant.finalPrice * line.quantity)}
                </span>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => removeLine(line.variant.id)}
                >
                  <Trash2 className="size-4" strokeWidth={1.8} />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {lines.length > 0 && (
          <div className="flex justify-end border-t border-white/[0.06] pt-3 text-sm font-bold text-white">
            جمع جزء: {formatPrice(subtotal)}
          </div>
        )}
      </section>

      <section className="glass-card flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 text-sm font-bold text-white">
            تخفیف‌ها و اشانتیون
          </h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addDiscountLine}
          >
            <Plus className="size-4" strokeWidth={1.8} />
            افزودن ردیف تخفیف
          </Button>
        </div>
        <p className="m-0 text-xs text-slate-500">
          برای کیف/لوازم اشانتیون: خودِ کالا را مثل یک قلم عادی با قیمت کامل
          بالا اضافه کن، بعد همین‌جا یک ردیف تخفیف هم‌ارزش با برچسب «تخفیف بابت
          کیف اشانتیون» بزن — مشتری روی فاکتور هم ارزش کالای هدیه و هم تخفیفش را
          جدا می‌بیند. برای تخفیف نقدی هم یک ردیف دیگر (مثلاً «تخفیف نقدی»)
          اضافه کن؛ چند ردیف هم‌زمان مجاز است.
        </p>
        {discountLines.length === 0 ? (
          <p className="m-0 text-xs text-slate-500">تخفیفی ثبت نشده.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {discountLines.map((d) => (
              <li
                key={d.key}
                className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_10rem_auto]"
              >
                <Input
                  placeholder="برچسب تخفیف — مثلاً «تخفیف بابت کیف اشانتیون»"
                  value={d.label}
                  onChange={(e) =>
                    patchDiscountLine(d.key, "label", e.target.value)
                  }
                />
                <Input
                  type="number"
                  min={1}
                  dir="ltr"
                  placeholder="مبلغ (تومان)"
                  value={d.amount}
                  onChange={(e) =>
                    patchDiscountLine(d.key, "amount", e.target.value)
                  }
                />
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => removeDiscountLine(d.key)}
                >
                  <Trash2 className="size-4" strokeWidth={1.8} />
                </Button>
              </li>
            ))}
          </ul>
        )}
        {lines.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-white/[0.06] pt-3 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>جمع جزء</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>مجموع تخفیف‌ها</span>
                <span>-{formatPrice(discountTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-white">
              <span>مبلغ نهایی</span>
              <span>{formatPrice(total)}</span>
            </div>
            {discountTotal > subtotal && (
              <p className="m-0 text-xs text-danger">
                مجموع تخفیف‌ها نمی‌تواند از جمع سفارش بیشتر باشد.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="glass-card flex flex-col gap-4 p-6">
        <h2 className="m-0 text-sm font-bold text-white">پرداخت</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="روش پرداخت">
            <Select
              value={paymentPlan}
              onChange={(e) => setPaymentPlan(e.target.value as PaymentPlan)}
            >
              {(
                Object.entries(PAYMENT_PLAN_LABELS) as [PaymentPlan, string][]
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end pb-2.5">
            <Switch
              checked={markPaid}
              onChange={setMarkPaid}
              label="قبلاً پرداخت شده — مستقیم به‌عنوان پرداخت‌شده ثبت شود"
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button
          disabled={!canSubmit || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "در حال ثبت…" : "ثبت سفارش"}
        </Button>
      </div>
    </div>
  );
}
