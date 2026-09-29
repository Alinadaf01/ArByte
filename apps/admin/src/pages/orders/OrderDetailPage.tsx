import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/Stateviews";
import { OrderStatusActions } from "@/pages/orders/OrderStatusActions";
import {
  DOCUMENT_LABELS,
  useOrderDocuments,
} from "@/pages/orders/useOrderDocuments";
import {
  getOrder,
  openReceiptFile,
  reviewReceipt,
  saveOrderSerials,
  type OrderDocumentKind,
} from "@/lib/api";
import { formatPrice, formatJalaliDateTime } from "@/lib/formatters";
import { useToast } from "@/lib/ToastContext";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  RECEIPT_STATUS_LABELS,
  STATUS_TONE,
  statusLabel,
  type AdminOrder,
  type OrderReceipt,
} from "@/types/order";

const DOCUMENT_KINDS: OrderDocumentKind[] = [
  "invoice",
  "packing-slip",
  "shipping-label",
  "warranty-cards",
];
const SERIAL_EDITABLE = new Set(["PAID", "PROCESSING"]);

function useInvalidateOrder(orderId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  };
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
          onClick={() =>
            openReceiptFile(receipt.id).catch((e: Error) =>
              toast.showError(e.message),
            )
          }
        >
          مشاهده‌ی فایل رسید
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

function SerialsCard({ order }: { order: AdminOrder }) {
  const toast = useToast();
  const invalidate = useInvalidateOrder(order.id);
  const units = order.items.flatMap((item) =>
    item.units.map((unit) => ({ unit, item })),
  );
  const [values, setValues] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      units.map(({ unit }) => [unit.id, unit.serialNumber ?? ""]),
    ),
  );
  const editable = SERIAL_EDITABLE.has(order.status);
  const mutation = useMutation({
    mutationFn: () =>
      saveOrderSerials(
        order.id,
        units.map(({ unit }) => ({
          id: unit.id,
          serialNumber: values[unit.id] ?? "",
        })),
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

  return (
    <section className="glass-card flex flex-col gap-3 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-sm font-bold text-white">سریال واحدها</h2>
        {!editable && (
          <span className="text-[11px] text-slate-500">
            فقط در وضعیت پرداخت‌شده یا در حال پردازش قابل ویرایش است.
          </span>
        )}
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {units.map(({ unit, item }, index) => (
          <li
            key={unit.id}
            className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_16rem]"
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
            <Input
              dir="ltr"
              aria-label={`سریال واحد ${index + 1}`}
              placeholder="شماره سریال"
              disabled={!editable}
              value={values[unit.id] ?? ""}
              onChange={(e) =>
                setValues((v) => ({ ...v, [unit.id]: e.target.value }))
              }
            />
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
            {mutation.isPending ? "در حال ذخیره…" : "ذخیره‌ی سریال‌ها"}
          </Button>
        </div>
      )}
    </section>
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

  const receipts = order.payments.flatMap((payment) => payment.receipts);

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

      {receipts.length > 0 && (
        <section className="glass-card p-6">
          <h2 className="m-0 text-sm font-bold text-white">
            رسیدهای کارت‌به‌کارت
          </h2>
          <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
            {receipts.map((receipt) => (
              <ReceiptRow key={receipt.id} order={order} receipt={receipt} />
            ))}
          </ul>
        </section>
      )}

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
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-3 font-semibold text-white">
                    {item.productName}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-1.5 border-t border-white/[0.06] px-6 py-4 text-sm">
          <div className="flex justify-between text-slate-400">
            <span>جمع جزء</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          {order.discountTotal > 0 && (
            <div className="flex justify-between text-slate-400">
              <span>تخفیف</span>
              <span>-{formatPrice(order.discountTotal)}</span>
            </div>
          )}
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
        <section className="glass-card flex flex-col gap-2 p-6">
          <h2 className="m-0 mb-1 text-sm font-bold text-white">
            مشتری و تحویل
          </h2>
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
        </section>

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
          {order.payments.map((payment) => (
            <InfoRow
              key={payment.id}
              label={PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
              value={`${formatPrice(payment.amount)}${payment.providerRef ? ` · ${payment.providerRef}` : ""}`}
            />
          ))}
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
