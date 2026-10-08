"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { GuestOrder } from "@arbyte/contracts";
import {
  formatPrice,
  orderStatusPage,
  toPersianDigits,
  trackOrderPage,
} from "@arbyte/contracts";
import {
  OrderTimeline,
  ORDER_STATUS_TO_STEP,
} from "@/components/order/OrderTimeline";
import { trackOrder } from "@/lib/track-api";

function money(amount: number): string {
  return formatPrice(BigInt(amount));
}

type Status = "idle" | "found" | "notFound";

export function TrackOrderView() {
  const searchParams = useSearchParams();

  const [orderNumber, setOrderNumber] = useState("");
  const [mobile, setMobile] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [bad, setBad] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [order, setOrder] = useState<GuestOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) setOrderNumber(code);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedOrderNumber = orderNumber.trim();
    const trimmedMobile = mobile.trim();
    if (!trimmedOrderNumber || !trimmedMobile) {
      setBad(true);
      setShakeKey((k) => k + 1);
      return;
    }
    setBad(false);
    setSubmitting(true);
    const result = await trackOrder(trimmedOrderNumber, trimmedMobile);
    setSubmitting(false);
    if (result.ok) {
      setOrder(result.order);
      setStatus("found");
    } else {
      setOrder(null);
      setStatus("notFound");
    }
  }

  const currentStep = order ? (ORDER_STATUS_TO_STEP[order.status] ?? 0) : 0;

  return (
    <div>
      <section className="border-border/60 bg-paper border-b px-[5vw] py-6.5">
        <div className="mx-auto max-w-[1240px]">
          <nav
            aria-label="مسیر"
            className="text-secondary mb-3.5 flex items-center gap-2 text-micro"
          >
            <Link href="/" className="text-secondary">
              {trackOrderPage.breadcrumbHome}
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/support" className="text-secondary">
              {trackOrderPage.breadcrumbSupport}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-primary font-semibold">
              {trackOrderPage.breadcrumbCurrent}
            </span>
          </nav>
          <h1 className="text-primary m-0 text-[clamp(26px,3.2vw,40px)] font-bold tracking-tight">
            {trackOrderPage.title}
          </h1>
          <p className="text-secondary-2 mt-2 max-w-[56ch] text-caption leading-loose">
            {trackOrderPage.subtitle}
          </p>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1240px] flex-col gap-4.5 px-[5vw] py-7">
        <form
          onSubmit={handleSubmit}
          noValidate
          className={`border-border rounded-card bg-paper flex flex-col gap-3.5 border p-5.5 ${
            bad ? (shakeKey % 2 ? "animate-shake" : "animate-shake-b") : ""
          }`}
        >
          <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] items-end gap-3">
            <label className="text-secondary-2 flex flex-col gap-1.5 text-micro">
              {trackOrderPage.orderNumberLabel}
              <input
                type="text"
                dir="ltr"
                value={orderNumber}
                onChange={(e) => {
                  setOrderNumber(e.target.value);
                  setBad(false);
                }}
                placeholder={trackOrderPage.orderNumberPlaceholder}
                className={`text-primary min-h-12.5 rounded-tile border px-3.5 text-right text-input ${
                  bad && !orderNumber.trim()
                    ? "border-danger-border"
                    : "border-border-input"
                }`}
              />
            </label>
            <label className="text-secondary-2 flex flex-col gap-1.5 text-micro">
              {trackOrderPage.mobileLabel}
              <input
                type="tel"
                dir="ltr"
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value);
                  setBad(false);
                }}
                placeholder={trackOrderPage.mobilePlaceholder}
                className={`text-primary min-h-12.5 rounded-tile border px-3.5 text-right text-input ${
                  bad && !mobile.trim()
                    ? "border-danger-border"
                    : "border-border-input"
                }`}
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary text-on-dark min-h-12.5 rounded-pill px-6.5 text-body font-semibold"
            >
              {trackOrderPage.submitCta}
            </button>
          </div>
          {bad ? (
            <p className="text-danger m-0 text-caption">
              {trackOrderPage.requiredFieldsNote}
            </p>
          ) : null}
        </form>

        {status === "found" && order ? (
          <div className="flex flex-wrap items-start gap-4.5">
            <div className="flex min-w-0 flex-1 basis-[420px] flex-col gap-3.5">
              <section className="border-border rounded-card bg-paper flex flex-col gap-1 border p-5.5">
                <h2 className="text-primary m-0 mb-2.5 text-body font-bold">
                  {trackOrderPage.timelineTitle}
                </h2>
                <OrderTimeline
                  currentStep={currentStep}
                  labels={orderStatusPage.timelineSteps}
                  pulseCurrent
                />
              </section>

              <section className="border-border rounded-card bg-paper flex flex-col gap-3.5 border p-5.5">
                <h2 className="text-primary m-0 text-body font-bold">
                  {trackOrderPage.itemsTitle}
                </h2>
                <div className="flex flex-col gap-2.5">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="border-border-divider flex items-baseline justify-between gap-3 border-b pb-2.5"
                    >
                      <span className="text-secondary min-w-0 text-body leading-relaxed">
                        {item.productName} · {toPersianDigits(item.quantity)}
                      </span>
                      <span className="text-caption font-semibold whitespace-nowrap">
                        {money(item.finalPrice)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-body font-bold">
                    {trackOrderPage.totalPaidLabel}
                  </span>
                  <span className="text-[clamp(16px,1.8vw,19px)] font-bold tracking-tight whitespace-nowrap">
                    {money(order.finalTotal)}
                  </span>
                </div>
              </section>
            </div>

            <aside className="flex min-w-0 flex-1 basis-[280px] flex-col gap-3.5 md:max-w-[360px]">
              <div className="border-border rounded-panel bg-paper flex flex-col gap-2 border p-5">
                <h2 className="text-primary m-0 text-caption font-bold">
                  {trackOrderPage.addressTitle}
                </h2>
                <p className="text-secondary m-0 text-body">
                  {trackOrderPage.addressCityOnlyNote(order.shippingCity)}
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
                  {trackOrderPage.documentsTitle}
                </h2>
                <p className="text-secondary-2 m-0 text-micro">
                  {trackOrderPage.guestInvoiceNote}
                </p>
                <Link
                  href={`/login?next=/orders/${encodeURIComponent(order.orderNumber)}`}
                  className="border-border-input text-secondary-2 flex min-h-11.5 items-center justify-center rounded-pill border text-caption font-semibold"
                >
                  {trackOrderPage.guestInvoiceCta}
                </Link>
                <Link
                  href={`/orders/${encodeURIComponent(order.orderNumber)}`}
                  className="bg-primary text-on-dark flex min-h-11.5 items-center justify-center rounded-pill text-caption font-semibold"
                >
                  {trackOrderPage.fullOrderPageCta}
                </Link>
              </div>

              <div className="bg-surface-dark flex flex-col gap-2.5 rounded-panel p-5">
                <h2 className="text-on-dark m-0 text-caption font-bold">
                  {trackOrderPage.supportBoxTitle}
                </h2>
                <p className="text-on-dark-secondary m-0 text-micro leading-relaxed">
                  {trackOrderPage.supportBoxNote}
                </p>
                <Link
                  href="/support"
                  className="bg-on-dark text-surface-dark flex min-h-11 items-center justify-center rounded-pill text-micro font-semibold"
                >
                  {trackOrderPage.supportBoxCta}
                </Link>
              </div>
            </aside>
          </div>
        ) : null}

        {status === "notFound" ? (
          <div className="border-border rounded-card bg-paper animate-rise flex flex-col items-center gap-3 border p-12 text-center">
            <p className="text-primary m-0 text-body font-bold">
              {trackOrderPage.notFoundTitle}
            </p>
            <p className="text-secondary m-0 max-w-[46ch] text-caption leading-loose">
              {trackOrderPage.notFoundNote}
            </p>
            <Link
              href="/support"
              className="bg-primary text-on-dark mt-1.5 flex min-h-11.5 items-center rounded-pill px-5.5 text-caption font-semibold"
            >
              {trackOrderPage.notFoundSupportCta}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
