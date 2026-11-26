import { Fragment, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/Stateviews";
import { OrderStatusActions } from "@/pages/orders/OrderStatusActions";
import {
  DOCUMENT_LABELS,
  useOrderDocuments,
} from "@/pages/orders/useOrderDocuments";
import {
  getOrder,
  fetchReceiptFile,
  type ReceiptFile,
  replaceOrderItem,
  reviewReceipt,
  saveOrderSerials,
  searchOrderVariants,
  updateOrderAddress,
  type OrderDocumentKind,
  type OrderVariantSearchRow,
} from "@/lib/api";
import { formatPrice, formatJalaliDateTime } from "@/lib/formatters";
import { useToast } from "@/lib/ToastContext";
import {
  BALE_SESSION_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_PLAN_LABELS,
  PAYMENT_STATUS_LABELS,
  RECEIPT_STATUS_LABELS,
  STATUS_TONE,
  statusLabel,
  type AdminOrder,
  type OrderItem,
  type OrderReceipt,
} from "@/types/order";

const DOCUMENT_KINDS: OrderDocumentKind[] = [
  "invoice",
  "packing-slip",
  "shipping-label",
  "warranty-cards",
];
const SERIAL_EDITABLE = new Set(["PAID", "PROCESSING"]);
// درخواست مدیر — دستمان روی اصلاح سفارش‌های پرداخت‌شده باز باشد؛ عیناً
// apps/backend/apps/orders/services.py's EDITABLE_ORDER_STATUSES (فقط تا
// قبل از SHIPPED، چون از آن به بعد موجودی واقعاً کسر شده).
const ORDER_EDITABLE_STATUSES = new Set([
  "PENDING",
  "AWAITING_PAYMENT",
  "PAYMENT_REVIEW",
  "PAID",
  "PROCESSING",
  "READY_TO_SHIP",
]);

function useInvalidateOrder(orderId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  };
}

/** AUDIT-1 §11 — پیش‌نمایش داخل پنل؛ blob هنگام بستن آزاد می‌شود. */
function ReceiptPreview({ receiptId }: { receiptId: number }) {
  const [file, setFile] = useState<ReceiptFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    fetchReceiptFile(receiptId)
      .then((result) => {
        url = result.url;
        if (alive) setFile(result);
        else URL.revokeObjectURL(result.url);
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [receiptId]);

  if (error) return <p className="m-0 text-xs text-danger">{error}</p>;
  if (!file) return <Skeleton className="h-48 w-full" />;
  const isImage = file.type.startsWith("image/");
  return (
    <div className="flex flex-col gap-2">
      {isImage ? (
        <a href={file.url} target="_blank" rel="noreferrer">
          <img
            src={file.url}
            alt="تصویر رسید پرداخت"
            className="max-h-[480px] w-full rounded-lg border border-white/[0.06] bg-ink-900 object-contain"
          />
        </a>
      ) : (
        <p className="m-0 text-xs text-slate-400">
          فایل PDF است و در پنل پیش‌نمایش نمی‌شود.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <a
          href={file.url}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold text-brand-300 underline"
        >
          باز کردن در زبانه‌ی جدید
        </a>
        <a
          href={file.url}
          download={`receipt-${receiptId}`}
          className="text-xs font-semibold text-brand-300 underline"
        >
          دانلود
        </a>
      </div>
    </div>
  );
}

function ReceiptRow({
  order,
  receipt,
}: {
  order: AdminOrder;
  receipt: OrderReceipt;
}) {
  const toast = useToast();
  const invalidate = useInvalidateOrder(order.id);
  const [rejecting, setRejecting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [reason, setReason] = useState("");
  const mutation = useMutation({
    mutationFn: (decision: "APPROVE" | "REJECT") =>
      reviewReceipt(receipt.id, decision, reason),
    onSuccess: (_d, decision) => {
      invalidate();
      toast.showSuccess(
        decision === "APPROVE"
          ? "رسید تأیید شد؛ سفارش پرداخت‌شده است."
          : "رسید رد شد.",
      );
      setRejecting(false);
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "بررسی رسید ناموفق بود.",
      ),
  });
  const pending = receipt.status === "PENDING";

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-ink-800/40 px-3.5 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-white">
          رسید کارت‌به‌کارت · {formatPrice(receipt.amount)}
        </span>
        <Chip
          tone={
            pending
              ? "warning"
              : receipt.status === "APPROVED"
                ? "success"
                : "danger"
          }
        >
          {RECEIPT_STATUS_LABELS[receipt.status]}
        </Chip>
      </div>
      <p className="m-0 text-[11px] text-slate-500">
        بارگذاری: {formatJalaliDateTime(receipt.uploadedAt)}
      </p>
      {receipt.rejectionReason && (
        <p className="m-0 text-xs text-danger">
          دلیل رد: {receipt.rejectionReason}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          aria-expanded={previewing}
          onClick={() => setPreviewing((v) => !v)}
        >
          {previewing ? "بستن پیش‌نمایش" : "مشاهده‌ی فایل رسید"}
        </Button>
        {pending && order.status === "PAYMENT_REVIEW" && (
          <>
            <Button
              size="sm"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate("APPROVE")}
            >
              تأیید رسید
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => setRejecting((v) => !v)}
            >
              رد رسید
            </Button>
          </>
        )}
      </div>
      {previewing && <ReceiptPreview receiptId={receipt.id} />}
      {rejecting && (
        <div className="flex flex-col gap-2">
          <Textarea
            placeholder="دلیل رد (برای مشتری پیامک نمی‌شود، در سفارش ثبت می‌شود)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button
            size="sm"
            variant="danger"
            disabled={!reason.trim() || mutation.isPending}
            onClick={() => mutation.mutate("REJECT")}
          >
            ثبت رد
          </Button>
        </div>
      )}
    </li>
  );
}

/**
 * AUDIT-3 §۶/§۱۶ — ترکیب پرداخت: کل، آنلاین، واریز، پرداخت‌شده، باقی‌مانده و
 * هر سهم با وضعیت، شناسه‌ی پرداخت بله و رسیدهای همان سهم (ادمین حدس نمی‌زند).
 */
function PaymentBreakdownCard({ order }: { order: AdminOrder }) {
  const b = order.paymentBreakdown;
  const shares = order.payments.filter((p) => p.status !== "VOID");
  const voided = order.payments.filter((p) => p.status === "VOID");
  return (
    <section className="glass-card flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-sm font-bold text-white">
          پرداخت · {PAYMENT_PLAN_LABELS[order.paymentPlan]}
        </h2>
        <Chip
          tone={order.paymentStatus === "CONFIRMED" ? "success" : "warning"}
        >
          {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
        </Chip>
      </div>
      <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(
          [
            ["مبلغ سفارش", b.total],
            ["آنلاین پرداخت‌شده", b.onlinePaid],
            ["واریز تأییدشده", b.bankPaid],
            ["کل پرداخت‌شده", b.paid],
            ["باقی‌مانده", b.remaining],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1">
            <dt className="text-[11px] text-slate-500">{label}</dt>
            <dd
              className={`m-0 text-sm font-bold ${label === "باقی‌مانده" && value > 0 ? "text-warning" : "text-white"}`}
            >
              {formatPrice(value)}
            </dd>
          </div>
        ))}
      </dl>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {shares.map((payment) => (
          <li
            key={payment.id}
            className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-ink-800/40 px-4 py-3 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-white">
                {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method} ·{" "}
                {formatPrice(payment.amount)}
              </span>
              <Chip
                tone={
                  payment.status === "CONFIRMED"
                    ? "success"
                    : payment.status === "FAILED"
                      ? "danger"
                      : "warning"
                }
              >
                {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
              </Chip>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
              {payment.paidAt && (
                <span>پرداخت: {formatJalaliDateTime(payment.paidAt)}</span>
              )}
              {payment.bale && (
                <span>
                  بله:{" "}
                  {BALE_SESSION_STATUS_LABELS[payment.bale.status] ??
                    payment.bale.status}
                </span>
              )}
              {payment.bale?.providerPaymentChargeId && (
                <span dir="ltr">
                  charge {payment.bale.providerPaymentChargeId}
                </span>
              )}
              {payment.providerRef && !payment.bale && (
                <span dir="ltr">ref {payment.providerRef}</span>
              )}
            </div>
            {(payment.failureReason || payment.bale?.failureReason) && (
              <p className="m-0 text-xs text-danger">
                {payment.failureReason || payment.bale?.failureReason}
              </p>
            )}
            {payment.receipts.length > 0 && (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {payment.receipts.map((receipt) => (
                  <ReceiptRow
                    key={receipt.id}
                    order={order}
                    receipt={receipt}
                  />
                ))}
              </ul>
            )}
            {payment.method === "MANUAL_CARD_TO_CARD" &&
              payment.receipts.length === 0 &&
              payment.status !== "CONFIRMED" && (
                <p className="m-0 text-xs text-slate-500">
                  رسیدی هنوز بارگذاری نشده.
                </p>
              )}
          </li>
        ))}
      </ul>
      {voided.length > 0 && (
        <p className="m-0 text-[11px] text-slate-500">
          {voided.length} سهم آنلاین به واریز مستقیم منتقل شد.
        </p>
      )}
    </section>
  );
}

interface UnitFormValues {
  serialNumber: string;
  warrantyMonths: string;
  testPeriodDays: string;
}

function SerialsCard({ order }: { order: AdminOrder }) {
  const toast = useToast();
  const invalidate = useInvalidateOrder(order.id);
  const units = order.items.flatMap((item) =>
    item.units.map((unit) => ({ unit, item })),
  );
  const [values, setValues] = useState<Record<number, UnitFormValues>>(() =>
    Object.fromEntries(
      units.map(({ unit }) => [
        unit.id,
        {
          serialNumber: unit.serialNumber ?? "",
          warrantyMonths: unit.warrantyMonthsOverride?.toString() ?? "",
          testPeriodDays: unit.testPeriodDaysOverride?.toString() ?? "",
        },
      ]),
    ),
  );
  const editable = SERIAL_EDITABLE.has(order.status);
  const mutation = useMutation({
    mutationFn: () =>
      saveOrderSerials(
        order.id,
        units.map(({ unit }) => {
          const v = values[unit.id];
          return {
            id: unit.id,
            serialNumber: v?.serialNumber ?? "",
            warrantyMonths: v?.warrantyMonths ? Number(v.warrantyMonths) : null,
            testPeriodDays: v?.testPeriodDays ? Number(v.testPeriodDays) : null,
          };
        }),
      ),
    onSuccess: () => {
      invalidate();
      toast.showSuccess("سریال‌ها ذخیره شد.");
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "ثبت سریال ناموفق بود.",
      ),
  });
  if (units.length === 0) return null;

  function patch(unitId: number, field: keyof UnitFormValues, value: string) {
    setValues((v) => ({
      ...v,
      [unitId]: { ...v[unitId], [field]: value } as UnitFormValues,
    }));
  }

  return (
    <section className="glass-card flex flex-col gap-3 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-sm font-bold text-white">
          سریال و گارانتی واحدها
        </h2>
        {!editable && (
          <span className="text-[11px] text-slate-500">
            فقط در وضعیت پرداخت‌شده یا در حال پردازش قابل ویرایش است.
          </span>
        )}
      </div>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {units.map(({ unit, item }, index) => (
          <li
            key={unit.id}
            className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-ink-800/40 px-3.5 py-3"
          >
            <div className="min-w-0">
              <p className="m-0 truncate text-sm text-white">
                {index + 1}. {item.productName}
                {item.variantName ? (
                  <span className="text-slate-400"> · {item.variantName}</span>
                ) : null}
              </p>
              <p className="m-0 text-[11px] text-slate-500" dir="ltr">
                {unit.certificateId}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Input
                dir="ltr"
                aria-label={`سریال واحد ${index + 1}`}
                placeholder="شماره سریال"
                disabled={!editable}
                value={values[unit.id]?.serialNumber ?? ""}
                onChange={(e) => patch(unit.id, "serialNumber", e.target.value)}
              />
              <Input
                type="number"
                min={0}
                dir="ltr"
                aria-label={`گارانتی (ماه) واحد ${index + 1}`}
                placeholder="گارانتی (ماه) — پیش‌فرض محصول"
                disabled={!editable}
                value={values[unit.id]?.warrantyMonths ?? ""}
                onChange={(e) =>
                  patch(unit.id, "warrantyMonths", e.target.value)
                }
              />
              <Input
                type="number"
                min={0}
                dir="ltr"
                aria-label={`مهلت تست (روز) واحد ${index + 1}`}
                placeholder="مهلت تست (روز) — پیش‌فرض سایت"
                disabled={!editable}
                value={values[unit.id]?.testPeriodDays ?? ""}
                onChange={(e) =>
                  patch(unit.id, "testPeriodDays", e.target.value)
                }
              />
            </div>
          </li>
        ))}
      </ul>
      {editable && (
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "در حال ذخیره…" : "ذخیره‌ی سریال و گارانتی"}
          </Button>
        </div>
      )}
    </section>
  );
}

interface AddressFormValues {
  mobile: string;
  recipientName: string;
  shippingProvince: string;
  shippingCity: string;
  shippingAddressLine: string;
  shippingPostalCode: string;
}

/** درخواست مدیر — سفارش پرداخت‌شده‌ای که آدرسش اشتباه ثبت شده باید قابل
 * اصلاح باشد؛ فاکتور (پنل و پنل مشتری) خودش بعد از اصلاح دوباره رندر می‌شود. */
function AddressCard({ order }: { order: AdminOrder }) {
  const toast = useToast();
  const invalidate = useInvalidateOrder(order.id);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<AddressFormValues>(() => ({
    mobile: order.shippingMobile,
    recipientName: order.shippingRecipientName,
    shippingProvince: order.shippingProvince,
    shippingCity: order.shippingCity,
    shippingAddressLine: order.shippingAddressLine,
    shippingPostalCode: order.shippingPostalCode ?? "",
  }));
  const editable = ORDER_EDITABLE_STATUSES.has(order.status);

  function startEditing() {
    setForm({
      mobile: order.shippingMobile,
      recipientName: order.shippingRecipientName,
      shippingProvince: order.shippingProvince,
      shippingCity: order.shippingCity,
      shippingAddressLine: order.shippingAddressLine,
      shippingPostalCode: order.shippingPostalCode ?? "",
    });
    setEditing(true);
  }

  function patch(field: keyof AddressFormValues, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const mutation = useMutation({
    mutationFn: () =>
      updateOrderAddress(order.id, {
        ...form,
        shippingPostalCode: form.shippingPostalCode.trim() || undefined,
      }),
    onSuccess: () => {
      invalidate();
      toast.showSuccess("آدرس سفارش اصلاح شد؛ فاکتور به‌روز می‌شود.");
      setEditing(false);
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "ویرایش آدرس ناموفق بود.",
      ),
  });

  const canSave =
    /^09\d{9}$/.test(form.mobile) &&
    form.recipientName.trim() !== "" &&
    form.shippingProvince.trim() !== "" &&
    form.shippingCity.trim() !== "" &&
    form.shippingAddressLine.trim() !== "";

  return (
    <section className="glass-card flex flex-col gap-2 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 mb-1 text-sm font-bold text-white">مشتری و تحویل</h2>
        {editable && !editing && (
          <Button size="sm" variant="secondary" onClick={startEditing}>
            ویرایش آدرس
          </Button>
        )}
      </div>
      {!editing ? (
        <>
          <InfoRow label="گیرنده" value={order.shippingRecipientName} />
          <InfoRow label="موبایل گیرنده" value={order.shippingMobile} ltr />
          <InfoRow label="موبایل حساب" value={order.userPhone} ltr />
          <InfoRow
            label="نشانی"
            value={`${order.shippingProvince}، ${order.shippingCity}، ${order.shippingAddressLine}`}
          />
          <InfoRow label="کد پستی" value={order.shippingPostalCode} ltr />
          <InfoRow label="روش ارسال" value={order.shippingMethodName} />
          <InfoRow label="شرکت ارسال" value={order.shipment?.provider} />
          <InfoRow
            label="کد رهگیری"
            value={order.shipment?.trackingNumber}
            ltr
          />
        </>
      ) : (
        <div className="flex flex-col gap-3 pt-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="موبایل گیرنده" required>
              <Input
                dir="ltr"
                value={form.mobile}
                onChange={(e) => patch("mobile", e.target.value.trim())}
              />
            </Field>
            <Field label="نام گیرنده" required>
              <Input
                value={form.recipientName}
                onChange={(e) => patch("recipientName", e.target.value)}
              />
            </Field>
            <Field label="استان" required>
              <Input
                value={form.shippingProvince}
                onChange={(e) => patch("shippingProvince", e.target.value)}
              />
            </Field>
            <Field label="شهر" required>
              <Input
                value={form.shippingCity}
                onChange={(e) => patch("shippingCity", e.target.value)}
              />
            </Field>
            <Field label="کد پستی" hint="اختیاری">
              <Input
                dir="ltr"
                value={form.shippingPostalCode}
                onChange={(e) => patch("shippingPostalCode", e.target.value)}
              />
            </Field>
          </div>
          <Field label="نشانی کامل" required>
            <Textarea
              value={form.shippingAddressLine}
              onChange={(e) => patch("shippingAddressLine", e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={mutation.isPending}
              onClick={() => setEditing(false)}
            >
              انصراف
            </Button>
            <Button
              size="sm"
              disabled={!canSave || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "در حال ذخیره…" : "ذخیره‌ی آدرس"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

/** درخواست مدیر — مشتری محصولی خریده که باید با محصول دیگری جایگزین شود؛
 * فاکتور هم باید درست شود. تا قبل از SHIPPED موجودی فقط رزرو است، پس
 * جایگزینی یعنی آزاد کردن رزرو قبلی + رزرو محصول تازه (پشت‌صحنه). */
function ItemReplacePanel({
  order,
  item,
  colSpan,
  onDone,
}: {
  order: AdminOrder;
  item: OrderItem;
  colSpan: number;
  onDone: () => void;
}) {
  const toast = useToast();
  const invalidate = useInvalidateOrder(order.id);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<OrderVariantSearchRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<OrderVariantSearchRow | null>(null);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [unitPrice, setUnitPrice] = useState(String(item.price));
  const [grade, setGrade] = useState(item.grade);
  const [batteryHealthPercent, setBatteryHealthPercent] = useState(
    item.batteryHealthPercent != null ? String(item.batteryHealthPercent) : "",
  );
  const [batteryCycleCount, setBatteryCycleCount] = useState(
    item.batteryCycleCount != null ? String(item.batteryCycleCount) : "",
  );
  const [storageHealthPercent, setStorageHealthPercent] = useState(
    item.storageHealthPercent != null ? String(item.storageHealthPercent) : "",
  );

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

  function pick(row: OrderVariantSearchRow) {
    setSelected(row);
    setUnitPrice(String(row.finalPrice));
    setResults([]);
    setSearch("");
  }

  const mutation = useMutation({
    mutationFn: () =>
      replaceOrderItem(order.id, item.id, {
        variantId: selected!.id,
        quantity: Number(quantity) || 1,
        unitPrice: Number(unitPrice) || undefined,
        grade: grade.trim() || undefined,
        batteryHealthPercent: batteryHealthPercent
          ? Number(batteryHealthPercent)
          : undefined,
        batteryCycleCount: batteryCycleCount
          ? Number(batteryCycleCount)
          : undefined,
        storageHealthPercent: storageHealthPercent
          ? Number(storageHealthPercent)
          : undefined,
      }),
    onSuccess: () => {
      invalidate();
      toast.showSuccess("محصول این قلم جایگزین شد؛ فاکتور به‌روز می‌شود.");
      onDone();
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "جایگزینی محصول ناموفق بود.",
      ),
  });

  const canSave = !!selected && Number(quantity) > 0 && Number(unitPrice) > 0;

  return (
    <tr>
      <td colSpan={colSpan} className="bg-ink-800/40 px-6 py-4">
        <div className="flex flex-col gap-3">
          <p className="m-0 text-xs text-slate-400">
            محصول جدید را جست‌وجو کنید تا جایگزین «{item.productName}» شود؛ قیمت
            و مشخصات فنی هم قابل‌ویرایش است.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="جست‌وجوی محصول جدید با نام یا SKU…"
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
            <ul className="m-0 flex list-none flex-col gap-1.5 rounded-xl border border-white/[0.06] bg-ink-900/60 p-2">
              {results.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => pick(row)}
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
          {selected && (
            <div className="rounded-xl border border-brand-400/30 bg-brand-400/5 px-3.5 py-3 text-sm text-white">
              محصول جدید: {selected.productName}
              {selected.name ? (
                <span className="text-slate-400"> · {selected.name}</span>
              ) : null}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Input
              type="number"
              min={1}
              dir="ltr"
              placeholder="تعداد"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <Input
              type="number"
              min={1}
              dir="ltr"
              placeholder="قیمت واحد"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
            />
            <Input
              placeholder="گرید (مثلاً A+)"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            />
            <Input
              type="number"
              min={0}
              max={100}
              dir="ltr"
              placeholder="سلامت باتری ٪"
              value={batteryHealthPercent}
              onChange={(e) => setBatteryHealthPercent(e.target.value)}
            />
            <Input
              type="number"
              min={0}
              dir="ltr"
              placeholder="سایکل باتری"
              value={batteryCycleCount}
              onChange={(e) => setBatteryCycleCount(e.target.value)}
            />
            <Input
              type="number"
              min={0}
              max={100}
              dir="ltr"
              placeholder="سلامت هارد ٪"
              value={storageHealthPercent}
              onChange={(e) => setStorageHealthPercent(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={mutation.isPending}
              onClick={onDone}
            >
              انصراف
            </Button>
            <Button
              size="sm"
              disabled={!canSave || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "در حال ذخیره…" : "ذخیره‌ی جایگزینی"}
            </Button>
          </div>
        </div>
      </td>
    </tr>
  );
}

function InfoRow({
  label,
  value,
  ltr,
}: {
  label: string;
  value: string | null | undefined;
  ltr?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-end text-slate-200" dir={ltr ? "ltr" : undefined}>
        {value}
      </span>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    data: order,
    isPending,
    isError,
    refetch,
  } = useQuery({ queryKey: ["order", id], queryFn: () => getOrder(id!) });
  const documents = useOrderDocuments(
    order ?? { id: id!, orderNumber: "", paidAt: null },
  );
  const [replacingItemId, setReplacingItemId] = useState<number | null>(null);

  if (isError)
    return (
      <ErrorState
        description="دریافت سفارش ناموفق بود."
        onRetry={() => refetch()}
      />
    );
  if (isPending || !order) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`سفارش ${order.orderNumber}`}
        description={`ثبت‌شده در ${formatJalaliDateTime(order.createdAt)}`}
        actions={
          <Chip tone={STATUS_TONE[order.status]} dot>
            {statusLabel(order.status)}
          </Chip>
        }
      />

      {documents.canDownload && (
        <section className="glass-card flex flex-wrap items-center gap-2 p-4">
          <span className="me-2 text-xs font-semibold text-slate-400">
            اسناد:
          </span>
          {DOCUMENT_KINDS.map((kind) => (
            <Button
              key={kind}
              variant="secondary"
              size="sm"
              disabled={documents.downloading === kind}
              onClick={() => documents.download(kind)}
            >
              <FileText className="size-4" strokeWidth={1.8} />
              {documents.downloading === kind
                ? "در حال آماده‌سازی…"
                : DOCUMENT_LABELS[kind]}
            </Button>
          ))}
        </section>
      )}

      <OrderStatusActions key={order.status} order={order} />

      <PaymentBreakdownCard order={order} />

      <SerialsCard key={`${order.id}-${order.updatedAt}`} order={order} />

      <section className="glass-card overflow-hidden p-0">
        <h2 className="m-0 border-b border-white/[0.06] px-6 py-4 text-sm font-bold text-white">
          اقلام سفارش
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-start text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                <th className="px-6 py-3 font-medium">محصول</th>
                <th className="px-4 py-3 font-medium">واریانت</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">قیمت واحد</th>
                <th className="px-4 py-3 font-medium">تعداد</th>
                <th className="px-4 py-3 font-medium">جمع</th>
                <th className="px-4 py-3 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {order.items.map((item) => {
                const conditionParts = [
                  item.grade ? `گرید ${item.grade}` : null,
                  item.batteryHealthPercent != null
                    ? `سلامت باتری ${item.batteryHealthPercent}٪`
                    : null,
                  item.batteryCycleCount != null
                    ? `سایکل باتری ${item.batteryCycleCount}`
                    : null,
                  item.storageHealthPercent != null
                    ? `سلامت هارد ${item.storageHealthPercent}٪`
                    : null,
                ].filter(Boolean);
                const replacing = replacingItemId === item.id;
                return (
                  <Fragment key={item.id}>
                    <tr>
                      <td className="px-6 py-3 font-semibold text-white">
                        {item.productName}
                        {conditionParts.length > 0 ? (
                          <p className="m-0 mt-0.5 text-[11px] font-normal text-slate-500">
                            {conditionParts.join(" · ")}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {item.variantName || "—"}
                      </td>
                      <td
                        className="px-4 py-3 font-mono text-[11px] text-slate-400"
                        dir="ltr"
                      >
                        {item.sku}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {formatPrice(item.price)}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {item.quantity.toLocaleString("fa-IR")}
                      </td>
                      <td className="px-4 py-3 font-bold text-white">
                        {formatPrice(item.finalPrice)}
                      </td>
                      <td className="px-4 py-3">
                        {ORDER_EDITABLE_STATUSES.has(order.status) && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              setReplacingItemId(replacing ? null : item.id)
                            }
                          >
                            {replacing ? "بستن" : "تغییر محصول"}
                          </Button>
                        )}
                      </td>
                    </tr>
                    {replacing && (
                      <ItemReplacePanel
                        order={order}
                        item={item}
                        colSpan={7}
                        onDone={() => setReplacingItemId(null)}
                      />
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-1.5 border-t border-white/[0.06] px-6 py-4 text-sm">
          <div className="flex justify-between text-slate-400">
            <span>جمع جزء</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          {order.discountLines.length > 0 ? (
            order.discountLines.map((line) => (
              <div
                key={line.id}
                className="flex justify-between text-slate-400"
              >
                <span>{line.label}</span>
                <span>-{formatPrice(line.amount)}</span>
              </div>
            ))
          ) : order.discountTotal > 0 ? (
            <div className="flex justify-between text-slate-400">
              <span>تخفیف</span>
              <span>-{formatPrice(order.discountTotal)}</span>
            </div>
          ) : null}
          <div className="flex justify-between text-slate-400">
            <span>هزینه ارسال</span>
            <span>{formatPrice(order.shippingCost)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-white/[0.06] pt-2 text-base font-bold text-white">
            <span>مبلغ نهایی</span>
            <span>{formatPrice(order.finalTotal)}</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AddressCard order={order} />

        <section className="glass-card flex flex-col gap-2 p-6">
          <h2 className="m-0 mb-1 text-sm font-bold text-white">
            فاکتور و پرداخت
          </h2>
          <InfoRow
            label="نوع فاکتور"
            value={order.invoiceType === "CORPORATE" ? "حقوقی" : "شخصی"}
          />
          <InfoRow label="نام شرکت" value={order.companyName} />
          <InfoRow label="شناسه ملی" value={order.nationalId} ltr />
          <InfoRow label="کد اقتصادی" value={order.economicCode} ltr />
          <InfoRow label="شماره ثبت" value={order.registrationNumber} ltr />
          <InfoRow
            label="وضعیت پرداخت"
            value={
              PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus
            }
          />
          {order.cancelReason && (
            <InfoRow label="دلیل لغو" value={order.cancelReason} />
          )}
        </section>
      </div>

      <section className="glass-card p-6">
        <h2 className="m-0 text-sm font-bold text-white">تاریخچه‌ی وضعیت</h2>
        {order.statusHistory.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500">
            هنوز تغییر وضعیتی ثبت نشده.
          </p>
        ) : (
          <ol className="m-0 mt-4 flex list-none flex-col gap-4 p-0">
            {order.statusHistory.map((log, index) => (
              <li key={index} className="relative flex gap-3 ps-5">
                <span className="absolute start-0 top-1.5 size-2 rounded-full bg-brand-400" />
                <div>
                  <p className="m-0 text-sm font-semibold text-white">
                    {log.fromStatus
                      ? `از «${statusLabel(log.fromStatus)}» به `
                      : ""}
                    «{statusLabel(log.toStatus)}»
                  </p>
                  <p className="m-0 text-[11px] text-slate-500">
                    {formatJalaliDateTime(log.createdAt)}
                    {log.changedBy && ` · ${log.changedBy}`}
                  </p>
                  {log.note && (
                    <p className="m-0 mt-1 text-xs text-slate-400">
                      {log.note}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
