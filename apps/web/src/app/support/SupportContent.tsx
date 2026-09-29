"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, FormField, Input, Textarea } from "@arbyte/ui";
import { supportPage, toLatinDigits, toPersianDigits } from "@arbyte/contracts";
import type { SiteInfo } from "@arbyte/contracts";

const PHONE_RE = /^09\d{9}$/;

interface SupportContentProps {
  phone: SiteInfo["phone"];
  email: string | null;
  businessHours: SiteInfo["businessHours"];
  fallbackHours: { from: number; to: number };
}

/** G-01 — Support.dc.html. فرم → `POST /contact` (پنل «پیام‌ها»)؛ کانال تلفن فقط با شماره‌ی SiteSettings؛ مراجعه‌ی حضوری/نقشه پنهان. */
export function SupportContent({
  phone: storePhone,
  email,
  businessHours,
  fallbackHours,
}: SupportContentProps) {
  const [topic, setTopic] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "invalid" | "error" | "limited"
  >("idle");
  const [trackingCode, setTrackingCode] = useState("");
  const [shakeKey, setShakeKey] = useState(0);

  const currentTopic = supportPage.form.topics[topic]!;

  const normalizedPhone = toLatinDigits(phone).replace(/[^0-9]/g, "");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "sending") return;
    const valid =
      name.trim().length >= 2 &&
      PHONE_RE.test(normalizedPhone) &&
      message.trim().length >= 10;
    if (!valid) {
      setStatus("invalid");
      setShakeKey((k) => k + 1);
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/proxy/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: normalizedPhone,
          topic: currentTopic.label,
          orderNumber: currentTopic.needsOrder ? orderNumber.trim() : "",
          message: message.trim(),
        }),
      });
      if (res.status === 429) return setStatus("limited");
      if (res.status === 400) {
        setShakeKey((k) => k + 1);
        return setStatus("invalid");
      }
      if (!res.ok) return setStatus("error");
      const body = (await res.json()) as { data: { trackingCode: string } };
      setTrackingCode(body.data.trackingCode);
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  const pickTopic = (index: number) => {
    setTopic(index);
    setStatus("idle");
  };

  const badName = status === "invalid" && name.trim().length < 2;
  const badPhone = status === "invalid" && !PHONE_RE.test(normalizedPhone);
  const badMessage = status === "invalid" && message.trim().length < 10;

  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-[clamp(18px,3vh,28px)] px-[5vw] py-[clamp(20px,3vh,32px)] pb-[clamp(48px,7vh,80px)]">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-[clamp(14px,2vw,18px)]">
        <a
          href="#arb-request"
          className="bg-surface-dark text-on-dark hover:shadow-popover flex flex-col gap-2.5 rounded-panel p-5 transition-[transform,box-shadow] duration-300 hover:-translate-y-1"
        >
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-brand-on-dark-alt"
            aria-hidden="true"
          >
            <path d="M21 12a9 9 0 0 1-13.2 7.9L3 21l1.2-4.6A9 9 0 1 1 21 12Z" />
          </svg>
          <span className="text-on-dark text-[15px] font-heading">
            {supportPage.channels.request.title}
          </span>
          <span className="text-on-dark-secondary text-caption leading-relaxed">
            {supportPage.channels.request.meta}
          </span>
        </a>
        {storePhone ? (
          <a
            href={storePhone.href}
            className="border-border bg-surface hover:border-border-done flex flex-col gap-2.5 rounded-panel border p-5 transition-[border-color,transform] duration-300 hover:-translate-y-1"
          >
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-brand"
              aria-hidden="true"
            >
              <path d="M6 3h3l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2 2 2 0 0 1 6 3Z" />
            </svg>
            <span className="text-[15px] font-heading">
              {supportPage.channels.call.title}
            </span>
            <span className="text-secondary text-caption leading-relaxed">
              <span dir="ltr">{storePhone.display}</span>
            </span>
          </a>
        ) : null}
        <Link
          href="/track-order"
          className="border-border bg-surface hover:border-border-done flex flex-col gap-2.5 rounded-panel border p-5 transition-[border-color,transform] duration-300 hover:-translate-y-1"
        >
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-brand"
            aria-hidden="true"
          >
            <path d="M2.5 7.5h10v9h-10z" />
            <path d="M12.5 10.5h4l3 3v3h-7z" />
            <circle cx="6.5" cy="17.5" r="1.8" />
            <circle cx="16.5" cy="17.5" r="1.8" />
          </svg>
          <span className="text-[15px] font-heading">
            {supportPage.channels.trackOrder.title}
          </span>
          <span className="text-secondary text-caption leading-relaxed">
            {supportPage.channels.trackOrder.meta}
          </span>
        </Link>
        <Link
          href="/legal"
          className="border-border bg-surface hover:border-border-done flex flex-col gap-2.5 rounded-panel border p-5 transition-[border-color,transform] duration-300 hover:-translate-y-1"
        >
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-brand"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .9-1 1.6v.4" />
            <path d="M12 17.2v.1" />
          </svg>
          <span className="text-[15px] font-heading">
            {supportPage.channels.faq.title}
          </span>
          <span className="text-secondary text-caption leading-relaxed">
            {supportPage.channels.faq.meta}
          </span>
        </Link>
      </div>

      <div className="flex flex-wrap items-start gap-[clamp(16px,2.5vw,26px)]">
        <section
          id="arb-request"
          className="border-border bg-surface flex min-w-0 flex-1 basis-105 scroll-mt-24 flex-col gap-4.5 rounded-card border p-[clamp(20px,3vw,28px)]"
        >
          <div>
            <h2 className="text-[17px] font-heading">
              {supportPage.form.title}
            </h2>
            <p className="text-secondary mt-2 text-caption leading-relaxed">
              {supportPage.form.subtitle}
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <span className="text-secondary text-micro">
              {supportPage.form.topicLabel}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {supportPage.form.topics.map((t, i) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => pickTopic(i)}
                  className={`min-h-11 rounded-tile-sm border px-4 text-caption font-medium transition-colors duration-200 ${
                    i === topic
                      ? "bg-primary text-on-dark border-primary"
                      : "text-secondary-2 border-border-input bg-surface"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-brand-active text-micro leading-relaxed">
              {currentTopic.hint}
            </p>
          </div>

          <form
            key={shakeKey}
            onSubmit={onSubmit}
            noValidate
            className={
              status === "invalid"
                ? shakeKey % 2
                  ? "animate-shake"
                  : "animate-shake-b"
                : undefined
            }
          >
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
              <FormField label={supportPage.form.nameLabel}>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={supportPage.form.namePlaceholder}
                  aria-invalid={badName}
                />
              </FormField>
              <FormField label={supportPage.form.phoneLabel}>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={supportPage.form.phonePlaceholder}
                  aria-invalid={badPhone}
                />
              </FormField>
            </div>

            {currentTopic.needsOrder ? (
              <div className="mt-3">
                <FormField label={supportPage.form.orderLabel}>
                  <Input
                    dir="ltr"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder={supportPage.form.orderPlaceholder}
                  />
                </FormField>
              </div>
            ) : null}

            <div className="mt-3">
              <FormField label={supportPage.form.messageLabel}>
                <Textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={currentTopic.placeholder}
                  aria-invalid={badMessage}
                />
              </FormField>
            </div>

            <div className="mt-3.5 flex flex-wrap items-center gap-3.5">
              <Button
                type="submit"
                disabled={status === "sending" || status === "sent"}
                variant={status === "sent" ? "outline" : "secondary"}
                className={
                  status === "sent"
                    ? "animate-pop border-border-done text-brand-active bg-brand-tint-1"
                    : undefined
                }
              >
                {status === "sent"
                  ? supportPage.form.submitted
                  : status === "sending"
                    ? supportPage.form.sending
                    : supportPage.form.submit}
              </Button>
              <p
                role="status"
                className={`text-micro leading-relaxed ${
                  status === "sent"
                    ? "text-accent-deep"
                    : status === "invalid" ||
                        status === "error" ||
                        status === "limited"
                      ? "text-danger"
                      : "text-caption"
                }`}
              >
                {status === "sent"
                  ? supportPage.form.noteSent(trackingCode)
                  : status === "invalid"
                    ? supportPage.form.noteInvalid
                    : status === "error"
                      ? supportPage.form.noteError
                      : status === "limited"
                        ? supportPage.form.noteRateLimited
                        : supportPage.form.noteDefault}
              </p>
            </div>
          </form>
        </section>

        <aside
          className="flex min-w-0 flex-1 basis-70 flex-col gap-3.5"
          style={{ maxWidth: 360 }}
        >
          <div className="border-border bg-surface flex flex-col gap-3.5 rounded-panel border p-5">
            <h2 className="text-[14.5px] font-heading">
              {supportPage.hours.title}
            </h2>
            <div className="flex flex-col gap-2.5">
              {(businessHours.length > 0
                ? businessHours
                : [
                    {
                      day: supportPage.hours.everyDay,
                      time: supportPage.hours.range(
                        toPersianDigits(fallbackHours.from),
                        toPersianDigits(fallbackHours.to),
                      ),
                    },
                  ]
              ).map((row) => (
                <div
                  key={row.day}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-secondary text-caption">{row.day}</span>
                  <span className="text-caption font-emphasis">{row.time}</span>
                </div>
              ))}
            </div>
            <p className="border-border-divider text-secondary text-micro leading-relaxed border-t pt-3.5">
              {supportPage.hours.outsideHours}
            </p>
          </div>

          {email ? (
            <div className="bg-surface-dark text-on-dark flex flex-col gap-2.5 rounded-panel p-5">
              <h2 className="text-on-dark text-[14.5px] font-heading">
                {supportPage.b2b.title}
              </h2>
              <p className="text-on-dark-secondary text-caption leading-relaxed">
                {supportPage.b2b.body}
              </p>
              <a
                href={`mailto:${email}`}
                dir="ltr"
                className="bg-on-dark text-primary hover:bg-brand-tint-1 flex min-h-11 items-center justify-center rounded-pill text-caption font-emphasis transition-colors duration-250"
              >
                {email}
              </a>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
