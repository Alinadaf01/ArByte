"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Order } from "@arbyte/contracts";
import {
  ORDER_STATUS_DB_TO_KEY,
  ORDER_STATUS_VALUES,
  checkoutPage,
  formatPrice,
  orderStatus,
  orderStatusPage,
  toPersianDigits,
} from "@arbyte/contracts";
import { formatDateFa } from "@arbyte/contracts/date";
import { downloadProxyFile } from "@/lib/download-file";
import {
  OrderTimeline,
  ORDER_STATUS_TO_STEP,
} from "@/components/order/OrderTimeline";
import {
  fetchOrder,
  uploadReceipt,
  type UploadReceiptInput,
} from "@/lib/order-api";

function money(amount: number): string {
  return formatPrice(BigInt(amount));
}

const PAID_INDEX = ORDER_STATUS_VALUES.indexOf("PAID");
const SHIPPED_INDEX = ORDER_STATUS_VALUES.indexOf("SHIPPED");

type Visual = { bg: string; border: string; fg: string; badgeBg: string };

function statusVisual(status: Order["status"]): Visual {
  if (status === "CANCELLED") {
    return {
      bg: "bg-danger-tint",
      border: "border-danger-border",
      fg: "text-danger",
      badgeBg: "bg-danger-tint",
    };
  }
  if (status === "AWAITING_PAYMENT" || status === "PAYMENT_REVIEW") {
    return {
      bg: "bg-brand-tint-3",
      border: "border-border-done",
      fg: "text-warning",
      badgeBg: "bg-brand-tint-3",
    };
  }
  if (status === "DELIVERED") {
    return {
      bg: "bg-brand-tint-1",
      border: "border-border-done",
      fg: "text-success-text",
      badgeBg: "bg-brand-tint-1",
    };
  }
  return {
    bg: "bg-brand-tint-2",
    border: "border-border-done",
    fg: "text-brand-active",
    badgeBg: "bg-brand-tint-2",
  };
}

function StatusIcon({
  status,
  className,
}: {
  status: Order["status"];
  className?: string;
}) {
  if (status === "CANCELLED") {
    return (
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <circle cx="12" cy="12" r="9" />
        <path d="m9 9 6 6M15 9l-6 6" />
      </svg>
    );
  }
  if (status === "AWAITING_PAYMENT" || status === "PAYMENT_REVIEW") {
    return (
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }
  if (status === "SHIPPED" || status === "READY_TO_SHIP") {
    return (
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <path d="M2.5 7.5h10v9h-10z" />
        <path d="M12.5 10.5h4l3 3v3h-7z" />
        <circle cx="6.5" cy="17.5" r="1.8" />
        <circle cx="16.5" cy="17.5" r="1.8" />
      </svg>
    );
  }
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

interface OrderStatusViewProps {
  orderNumber: string;
}

export function OrderStatusView({ orderNumber }: OrderStatusViewProps) {
  const searchParams = useSearchParams();
  const isPaymentReturn = searchParams.get("payment") === "return";

  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [returnPhase, setReturnPhase] = useState<
    "checking" | "stillWaiting" | null
  >(isPaymentReturn ? "checking" : null);

  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [invState, setInvState] = useState<"idle" | "preparing" | "done">(
    "idle",
  );
  const [warrantyState, setWarrantyState] = useState<
    Record<string, "idle" | "preparing" | "done">
  >({});

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollDeadlineRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const fresh = await fetchOrder(orderNumber);
    setOrder(fresh);
    return fresh;
  }, [orderNumber]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isPaymentReturn) return;
    pollRef.current = setInterval(async () => {
      const fresh = await load();
      if (fresh && fresh.status !== "AWAITING_PAYMENT") {
        setReturnPhase(null);
        if (pollRef.current) clearInterval(pollRef.current);
        if (pollDeadlineRef.current) clearTimeout(pollDeadlineRef.current);
      }
    }, 3000);
    pollDeadlineRef.current = setTimeout(() => {
      if (pollRef.current) clearInterval(pollRef.current);
      setReturnPhase((phase) =>
        phase === "checking" ? "stillWaiting" : phase,
      );
    }, 30000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (pollDeadlineRef.current) clearTimeout(pollDeadlineRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- فقط یک‌بار روی mount شروع شود
  }, [isPaymentReturn]);

  async function handleCopy(label: string, value: string) {
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        // بی‌اهمیت — کاربر می‌تواند دستی انتخاب کند
      }
    }
    setCopied(label);
    setTimeout(() => setCopied((c) => (c === label ? null : c)), 1800);
  }

  async function handleSubmitReceipt() {
    if (!file || !order || sending) return;
    setSending(true);
    const input: UploadReceiptInput = {
      orderNumber,
      file,
      amount: order.finalTotal,
    };
    const ok = await uploadReceipt(input);
    setSending(false);
    if (ok) {
      setSent(true);
      await load();
    }
  }

  async function handleDownloadInvoice() {
    setInvState("preparing");
    const ok = await downloadProxyFile(
      `/orders/${encodeURIComponent(orderNumber)}/invoice.pdf`,
      `${orderNumber}.pdf`,
    );
    setInvState(ok ? "done" : "idle");
    if (ok) setTimeout(() => setInvState("idle"), 3000);
  }

  async function handleDownloadWarranty(certificateId: string) {
    setWarrantyState((s) => ({ ...s, [certificateId]: "preparing" }));
    const ok = await downloadProxyFile(
      `/orders/${encodeURIComponent(orderNumber)}/units/${encodeURIComponent(certificateId)}/warranty.pdf`,
      `${certificateId}.pdf`,
    );
    setWarrantyState((s) => ({ ...s, [certificateId]: ok ? "done" : "idle" }));
    if (ok) {
      setTimeout(
        () => setWarrantyState((s) => ({ ...s, [certificateId]: "idle" })),
        3000,
      );
    }
  }

  if (order === undefined) {
    return (
      <div className="mx-auto max-w-[1240px] px-[5vw] py-16 text-center text-secondary">
        …
      </div>
    );
  }

  if (order === null) {
    return (
      <div className="mx-auto max-w-[1240px] px-[5vw] py-16">
        <div className="border-border rounded-card bg-paper animate-rise flex flex-col items-center gap-3 border p-12 text-center">
          <p className="text-primary m-0 text-body font-bold">
            {orderStatusPage.notFoundTitle}
          </p>
          <p className="text-secondary m-0 max-w-[46ch] text-caption leading-loose">
            {orderStatusPage.notFoundNote}
          </p>
        </div>
      </div>
    );
  }

  const statusKey =
    ORDER_STATUS_DB_TO_KEY[order.status as keyof typeof ORDER_STATUS_DB_TO_KEY];
  const visual = statusVisual(order.status);
  const currentStep = ORDER_STATUS_TO_STEP[order.status] ?? 0;
  const orderIndex = ORDER_STATUS_VALUES.indexOf(order.status);
  const invoiceAvailable =
    order.status !== "CANCELLED" && orderIndex >= PAID_INDEX;
  const warrantyAvailable =
    order.status !== "CANCELLED" && orderIndex >= SHIPPED_INDEX;
  const isCardToCard =
    order.payment?.method === "MANUAL_CARD_TO_CARD" &&
    order.cardToCardAccount !== null;
  const showReceiptUpload = isCardToCard && order.paymentStatus !== "CONFIRMED";

  const heroNote =
    returnPhase === "checking"
      ? orderStatusPage.paymentReturn.checking
      : orderStatusPage.stateNotes[statusKey];

  return (
    <div>
      <section className="border-border/60 bg-paper border-b px-[5vw] py-6.5">
        <div className="mx-auto max-w-[1240px]">
          <h1 className="text-primary m-0 text-[clamp(24px,3vw,38px)] font-bold tracking-tight">
            {orderStatus[statusKey]}
          </h1>
          <p className="text-secondary-2 mt-2 max-w-[56ch] text-caption leading-loose">
            {heroNote}
          </p>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-4.5 px-[5vw] py-7">
        <div className="flex min-w-0 flex-1 basis-[420px] flex-col gap-3.5">
          <div
            className={`rounded-card flex flex-wrap items-center gap-4.5 border p-5.5 ${visual.bg} ${visual.border}`}
          >
            <span
              className={`flex h-13 w-13 flex-none items-center justify-center rounded-full ${visual.badgeBg} ${visual.fg}`}
            >
              <StatusIcon status={order.status} />
            </span>
            <div className="flex min-w-0 flex-1 basis-[200px] flex-col gap-1">
              <span className="text-primary text-body font-bold">
                {orderStatus[statusKey]}
              </span>
              <span className="text-secondary-2 text-caption leading-relaxed">
                {heroNote}
              </span>
              {returnPhase === "stillWaiting" ? (
                <span className="text-warning mt-1 text-caption font-semibold">
                  {orderStatusPage.paymentReturn.stillWaitingNote}
                </span>
              ) : null}
            </div>
            <div className="flex flex-col items-start gap-1">
              <span className="text-secondary-2 text-micro">
                {orderStatusPage.orderNumberLabel}
              </span>
              <span dir="ltr" className="text-primary text-body font-bold">
                {order.orderNumber}
              </span>
            </div>
          </div>

          {showReceiptUpload ? (
            <section className="border-border rounded-card bg-paper flex flex-col gap-4.5 border p-5.5">
              <h2 className="text-primary m-0 text-body font-bold">
                {orderStatusPage.cardToCard.title}
              </h2>
              <div className="bg-surface-dark flex flex-col gap-3.5 rounded-tile p-4.5">
                {(
                  [
                    [
                      "sheba",
                      orderStatusPage.cardToCard.bankLabel,
                      order.cardToCardAccount!.sheba,
                    ],
                    [
                      "cardNumber",
                      orderStatusPage.cardToCard.cardLabel,
                      order.cardToCardAccount!.cardNumber,
                    ],
                    [
                      "holderName",
                      orderStatusPage.cardToCard.holderLabel,
                      order.cardToCardAccount!.holderName,
                    ],
                  ] as const
                ).map(([key, label, value]) => (
                  <div
                    key={key}
                    className="border-on-dark-tertiary/20 bg-on-dark/5 flex flex-wrap items-center justify-between gap-2.5 rounded-tile border p-3.5"
                  >
                    <span className="text-on-dark-secondary text-micro">
                      {label}
                    </span>
                    <span
                      dir="ltr"
                      className="text-on-dark min-w-0 text-caption font-semibold tracking-wider break-all"
                    >
                      {value}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(key, value)}
                      className="border-on-dark-tertiary/30 text-on-dark min-h-11 rounded-tile border bg-transparent px-4 text-micro font-semibold whitespace-nowrap"
                    >
                      {copied === key
                        ? orderStatusPage.cardToCard.copyDone
                        : orderStatusPage.cardToCard.copyIdle}
                    </button>
                  </div>
                ))}
                <p className="text-on-dark-secondary m-0 text-micro leading-loose">
                  {orderStatusPage.cardToCard.amountNote(order.orderNumber)}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-primary m-0 text-caption font-bold">
                  {orderStatusPage.cardToCard.receiptSectionTitle}
                </h3>
                <label className="border-border-input flex min-h-[130px] cursor-pointer flex-col items-center justify-center gap-2 rounded-tile border border-dashed bg-paper p-5 text-center">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="sr-only"
                    disabled={sent}
                  />
                  <span className="text-primary text-caption font-semibold">
                    {file ? file.name : orderStatusPage.cardToCard.dropzoneIdle}
                  </span>
                  <span className="text-secondary-2 max-w-[40ch] text-micro leading-relaxed">
                    {orderStatusPage.cardToCard.dropzoneHint}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={handleSubmitReceipt}
                  disabled={!file || sending || sent}
                  className={`flex min-h-12.5 items-center justify-center rounded-pill text-body font-semibold ${
                    sent
                      ? "bg-brand-tint-1 text-brand-active"
                      : file && !sending
                        ? "bg-primary text-on-dark"
                        : "text-secondary bg-brand-tint-3 cursor-not-allowed"
                  }`}
                >
                  {sent
                    ? orderStatusPage.cardToCard.submitDone
                    : sending
                      ? orderStatusPage.cardToCard.submitSending
                      : orderStatusPage.cardToCard.submitIdle}
                </button>
                {sent ? (
                  <p className="text-secondary-2 m-0 text-micro leading-loose">
                    {orderStatusPage.cardToCard.afterSubmitNote}
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="border-border rounded-card bg-paper flex flex-col gap-1 border p-5.5">
            <h2 className="text-primary m-0 mb-2.5 text-body font-bold">
              {orderStatusPage.timelineTitle}
            </h2>
            {order.status === "CANCELLED" ? (
              <p className="text-secondary m-0 text-caption">
                {orderStatusPage.stateNotes.cancelled}
              </p>
            ) : (
              <OrderTimeline
                currentStep={currentStep}
                labels={orderStatusPage.timelineSteps}
              />
            )}
          </section>
        </div>

        <aside className="flex min-w-0 flex-1 basis-[300px] flex-col gap-3.5 md:max-w-[380px]">
          <div className="border-border rounded-panel bg-paper flex flex-col gap-3.5 border p-5">
            <h2 className="text-primary m-0 text-caption font-bold">
              {orderStatusPage.summaryTitle}
            </h2>
            <div className="flex flex-col gap-2.5">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3"
                >
                  <span className="text-secondary min-w-0 text-body leading-relaxed">
                    {item.productName} · {toPersianDigits(item.quantity)}
                  </span>
                  <span className="text-body font-medium whitespace-nowrap">
                    {money(item.finalPrice)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-border-divider flex items-baseline justify-between gap-3 border-t pt-3.5">
              <span className="text-body font-bold">
                {checkoutPage.totalLabel}
              </span>
              <span className="text-[clamp(17px,2vw,20px)] font-bold tracking-tight whitespace-nowrap">
                {money(order.finalTotal)}
              </span>
            </div>
          </div>

          <div className="border-border rounded-panel bg-paper flex flex-col gap-2 border p-5">
            <h2 className="text-primary m-0 text-caption font-bold">
              {orderStatusPage.deliveryTitle}
            </h2>
            <p className="text-secondary m-0 text-body leading-loose">
              {order.shippingAddress.recipientName}
              <br />
              {order.shippingAddress.province}، {order.shippingAddress.city}،{" "}
              {order.shippingAddress.addressLine}
              <br />
              <span dir="ltr">
                {toPersianDigits(order.shippingAddress.mobile)}
              </span>
            </p>
            {order.shipment ? (
              <p className="text-secondary-2 m-0 text-micro">
                {order.shipment.provider}
                {order.shipment.trackingNumber
                  ? ` · ${toPersianDigits(order.shipment.trackingNumber)}`
                  : ""}
              </p>
            ) : null}
          </div>

          <div className="border-border rounded-panel bg-paper flex flex-col gap-3 border p-5">
            <h2 className="text-primary m-0 text-caption font-bold">
              {orderStatusPage.invoiceSectionTitle}
            </h2>
            {invoiceAvailable ? (
              <button
                type="button"
                onClick={handleDownloadInvoice}
                disabled={invState === "preparing"}
                className={`flex min-h-11.5 items-center justify-center rounded-pill text-caption font-semibold ${
                  invState === "done"
                    ? "bg-brand-tint-1 text-brand-active"
                    : "bg-primary text-on-dark"
                }`}
              >
                {invState === "preparing"
                  ? orderStatusPage.invoiceDownloadPreparing
                  : invState === "done"
                    ? orderStatusPage.invoiceDownloadDone
                    : orderStatusPage.invoiceDownloadIdle}
              </button>
            ) : (
              <p className="text-secondary-2 m-0 text-micro leading-relaxed">
                {orderStatusPage.invoiceNotAvailableNote}
              </p>
            )}
          </div>

          {order.items.some((item) => item.units && item.units.length > 0) ? (
            <div className="border-border rounded-panel bg-paper flex flex-col gap-3 border p-5">
              <h2 className="text-primary m-0 text-caption font-bold">
                {orderStatusPage.warrantyCardSectionTitle}
              </h2>
              {warrantyAvailable ? (
                <div className="flex flex-col gap-2">
                  {order.items.flatMap((item) =>
                    (item.units ?? []).map((unit) => (
                      <div
                        key={unit.certificateId}
                        className="flex flex-wrap items-center justify-between gap-2"
                      >
                        <span className="text-secondary min-w-0 text-micro">
                          {item.productName}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleDownloadWarranty(unit.certificateId)
                          }
                          disabled={
                            warrantyState[unit.certificateId] === "preparing"
                          }
                          className="border-border-input text-secondary-2 min-h-10 rounded-tile border bg-paper px-3.5 text-micro font-semibold whitespace-nowrap"
                        >
                          {warrantyState[unit.certificateId] === "done"
                            ? orderStatusPage.invoiceDownloadDone
                            : orderStatusPage.warrantyCardDownloadCta}
                        </button>
                      </div>
                    )),
                  )}
                </div>
              ) : (
                <p className="text-secondary-2 m-0 text-micro leading-relaxed">
                  {orderStatusPage.warrantyCardNotAvailableNote}
                </p>
              )}
            </div>
          ) : null}

          <p className="text-secondary-2 m-0 text-center text-micro">
            {formatDateFa(new Date(order.createdAt))}
          </p>
        </aside>
      </div>
    </div>
  );
}
