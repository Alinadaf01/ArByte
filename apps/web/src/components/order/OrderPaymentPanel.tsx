"use client";

import { useEffect, useRef, useState } from "react";
import type { Order } from "@arbyte/contracts";
import { formatPrice, orderStatusPage } from "@arbyte/contracts";
import {
  moveRemainderToBank,
  startOnlinePayment,
  type OnlinePaymentLink,
} from "@/lib/order-api";

const copy = orderStatusPage.payment;
const PAYMENT_PHASE = new Set(["AWAITING_PAYMENT", "PAYMENT_REVIEW"]);
const POLL_MS = 5000;
const POLL_FOR_MS = 10 * 60 * 1000;

function money(amount: number): string {
  return formatPrice(BigInt(amount));
}

type Share = NonNullable<Order["payments"]>[number];

export function onlineShareOpen(order: Order): Share | undefined {
  if (!PAYMENT_PHASE.has(order.status)) return undefined;
  return order.payments?.find(
    (p) =>
      p.method === "GATEWAY" &&
      (p.status === "UNPAID" || p.status === "FAILED"),
  );
}

/**
 * AUDIT-3 §۵/§۶/§۱۵ — ترکیب پرداخت + پرداخت آنلاین در «بله». ADDENDUM §C:
 * صریح گفته می‌شود پرداخت در اپ «بله» است؛ «باز کردن بله» با کلیک کاربر و
 * QR/لینک برای دسکتاپ. بعد از شروع، صفحه چند دقیقه خودکار تازه می‌شود.
 */
export function OrderPaymentPanel({
  order,
  onRefresh,
}: {
  order: Order;
  onRefresh: () => Promise<Order | null>;
}) {
  const [link, setLink] = useState<OnlinePaymentLink | null>(null);
  const [starting, setStarting] = useState(false);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const shares = order.payments ?? [];
  const breakdown = order.paymentBreakdown;
  const online = onlineShareOpen(order);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    // سهم آنلاین پرداخت شد → توقف به‌روزرسانی خودکار و پنهان شدن لینک.
    if (!online && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
      setLink(null);
    }
  }, [online]);

  function startPolling() {
    if (pollRef.current) return;
    const until = Date.now() + POLL_FOR_MS;
    pollRef.current = setInterval(() => {
      if (Date.now() > until && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        return;
      }
      void onRefresh();
    }, POLL_MS);
  }

  async function handleOpenBale() {
    if (starting) return;
    setStarting(true);
    setError(null);
    const result = await startOnlinePayment(order.orderNumber);
    setStarting(false);
    if (!result.ok) {
      setError(result.message || copy.online.startError);
      return;
    }
    setLink(result.link);
    startPolling();
    // موبایل: مستقیم به بله (لینک ble.ir اپ را باز می‌کند). دسکتاپ: QR و لینک می‌ماند.
    if (window.matchMedia("(pointer: coarse)").matches) {
      window.location.href = result.link.deepLink;
    }
  }

  async function handleMoveToBank() {
    if (moving) return;
    setMoving(true);
    setError(null);
    const updated = await moveRemainderToBank(order.orderNumber);
    setMoving(false);
    if (!updated) {
      setError(copy.online.startError);
      return;
    }
    setLink(null);
    await onRefresh();
  }

  if (!breakdown || shares.length === 0) return null;

  return (
    <section className="border-border rounded-card bg-paper flex flex-col gap-4 border p-5">
      <h2 className="text-primary m-0 text-body font-bold">{copy.title}</h2>

      <dl className="m-0 grid grid-cols-3 gap-3">
        {[
          [copy.totalLabel, breakdown.total],
          [copy.paidLabel, breakdown.paid],
          [copy.remainingLabel, breakdown.remaining],
        ].map(([label, value]) => (
          <div key={label as string} className="flex flex-col gap-1">
            <dt className="text-secondary-2 text-micro">{label}</dt>
            <dd className="text-primary m-0 text-caption font-bold">
              {money(value as number)}
            </dd>
          </div>
        ))}
      </dl>

      {shares.length > 1 || breakdown.plan !== "BANK_TRANSFER" ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {shares.map((share) => (
            <li
              key={share.id}
              className="border-border flex flex-wrap items-center justify-between gap-2 rounded-tile border px-3.5 py-2.5"
            >
              <span className="text-primary text-caption font-semibold">
                {share.method === "GATEWAY"
                  ? copy.shareLabels.online
                  : copy.shareLabels.bank}{" "}
                · {money(share.amount)}
              </span>
              <span
                className={`text-micro font-semibold ${
                  share.status === "CONFIRMED"
                    ? "text-success"
                    : "text-secondary"
                }`}
              >
                {copy.shareStatus[share.status]}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {online ? (
        <div className="bg-brand-tint-2 border-brand/30 flex flex-col gap-3 rounded-tile border p-4">
          <h3 className="text-primary m-0 text-body font-bold">
            {copy.online.title}
          </h3>
          <p className="text-secondary m-0 text-caption leading-loose">
            {copy.online.note(money(online.amount))}
          </p>
          <button
            type="button"
            onClick={handleOpenBale}
            disabled={starting}
            className="bg-primary text-on-dark flex min-h-12 items-center justify-center rounded-pill px-6 text-body font-semibold disabled:opacity-60"
          >
            {starting ? copy.online.preparing : copy.online.openCta}
          </button>

          {link ? (
            <div className="flex flex-wrap items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- data: URI ساخت سرور، نه تصویر بهینه‌پذیر */}
              <img
                src={link.qrDataUri}
                alt={copy.online.linkLabel}
                width={132}
                height={132}
                className="bg-paper rounded-tile p-1.5"
              />
              <div className="flex min-w-0 flex-1 basis-[180px] flex-col gap-1.5">
                <p className="text-secondary m-0 text-caption leading-relaxed">
                  {copy.online.desktopNote}
                </p>
                <a
                  href={link.deepLink}
                  dir="ltr"
                  className="text-brand break-all text-micro font-semibold underline"
                >
                  {link.deepLink}
                </a>
                <p className="text-secondary-2 m-0 text-micro">
                  {copy.online.waiting}
                </p>
              </div>
            </div>
          ) : null}

          <div className="border-border/70 flex flex-col gap-1.5 border-t pt-3">
            <span className="text-primary text-caption font-semibold">
              {copy.online.failedTitle}
            </span>
            <p className="text-secondary-2 m-0 text-micro leading-relaxed">
              {copy.online.failedNote}
            </p>
            <button
              type="button"
              onClick={handleMoveToBank}
              disabled={moving}
              className="border-border-input text-primary self-start rounded-pill border bg-paper px-4 py-2 text-caption font-medium disabled:opacity-60"
            >
              {moving ? copy.online.moving : copy.online.moveToBankCta}
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-danger m-0 text-caption">
          {error}
        </p>
      ) : null}
    </section>
  );
}
