"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { siteFooter } from "@arbyte/contracts";
import type { SiteInfo } from "@arbyte/contracts";
import { Logo } from "./Logo";

const socialLinks = [
  {
    key: "instagram" as const,
    label: siteFooter.social.instagram,
    icon: (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    key: "telegram" as const,
    label: siteFooter.social.telegram,
    icon: (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 4 3 11l5 2 2 6 3-4 5 4z" />
        <path d="m8 13 9-6-5 8" />
      </svg>
    ),
  },
  {
    key: "whatsapp" as const,
    label: siteFooter.social.whatsapp,
    icon: (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12a9 9 0 0 1-13.2 7.9L3 21l1.2-4.6A9 9 0 1 1 21 12Z" />
        <path d="M9.3 8.6h1.2l.9 2-.9.8a6.4 6.4 0 0 0 3.1 3.1l.8-.9 2 .9v1.2a1 1 0 0 1-1.1 1 8.4 8.4 0 0 1-7-7 1 1 0 0 1 1-1.1Z" />
      </svg>
    ),
  },
  {
    key: "youtube" as const,
    label: siteFooter.social.youtube,
    icon: (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
        <path
          d="m10.5 9.5 4.5 2.5-4.5 2.5z"
          fill="currentColor"
          stroke="none"
        />
      </svg>
    ),
  },
];

const MailIcon = (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-brand-on-dark mt-0.5 flex-none"
    aria-hidden="true"
  >
    <rect x="2.5" y="5" width="19" height="14" rx="3" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);
const PhoneIcon = (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-brand-on-dark mt-0.5 flex-none"
    aria-hidden="true"
  >
    <path d="M6 3h3l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2 2 2 0 0 1 6 3Z" />
  </svg>
);
const PinIcon = (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-brand-on-dark mt-0.5 flex-none"
    aria-hidden="true"
  >
    <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);

/** G-01 — تماس/شبکه‌ها/نماد اعتماد از `GET /content/site-info`؛ مورد خالی پنهان (بدون شماره/نشانی نمونه). */
export function SiteFooter({ info }: { info: SiteInfo }) {
  const socials = socialLinks.filter((s) => info.socials[s.key]);
  const hasContact = Boolean(
    info.email || info.phone || info.address || info.trustBadge,
  );
  return (
    <>
      {/* دسکتاپ */}
      <footer
        dir="rtl"
        className="bg-surface-dark text-on-dark relative hidden overflow-hidden rounded-t-[28px] px-[5vw] pt-[clamp(48px,7vh,84px)] pb-[clamp(24px,3vh,34px)] font-sans md:block"
      >
        <div
          aria-hidden="true"
          className="bg-glow-violet absolute -top-45 -start-30 h-130 w-130 rounded-full"
        />
        <div
          aria-hidden="true"
          className="bg-glow-cyan absolute -bottom-55 -end-25 h-120 w-120 rounded-full"
        />

        <div className="relative mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(168px,1fr))] gap-[clamp(24px,3vw,52px)]">
          <div className="flex flex-col gap-5">
            <Logo
              variant="horizontal-dark"
              alt={siteFooter.logoAlt}
              className="h-10 self-start"
            />
            <p className="text-on-dark-tertiary max-w-[38ch] text-body leading-loose">
              {siteFooter.tagline}
            </p>
            <div className="flex flex-wrap gap-2.5">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={info.socials[s.key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="hover:border-brand-on-dark flex h-9.5 w-9.5 items-center justify-center rounded-tile border border-white/14 transition-colors duration-250 hover:bg-brand/30"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          <nav className="flex flex-col gap-4.5">
            <p className="text-on-dark text-subhead text-[15px] font-emphasis">
              {siteFooter.shopColumn.title}
            </p>
            <ul className="flex flex-col gap-3 text-body">
              <li>
                <Link
                  href="/products"
                  className="text-on-dark-tertiary hover:text-on-dark transition-colors duration-250"
                >
                  {siteFooter.shopColumn.gamingLaptop}
                </Link>
              </li>
              <li>
                <Link
                  href="/products"
                  className="text-on-dark-tertiary hover:text-on-dark transition-colors duration-250"
                >
                  {siteFooter.shopColumn.proLaptop}
                </Link>
              </li>
              <li>
                <Link
                  href="/products"
                  className="text-on-dark-tertiary hover:text-on-dark transition-colors duration-250"
                >
                  {siteFooter.shopColumn.monitor}
                </Link>
              </li>
              <li>
                <Link
                  href="/products"
                  className="text-on-dark-tertiary hover:text-on-dark transition-colors duration-250"
                >
                  {siteFooter.shopColumn.accessories}
                </Link>
              </li>
            </ul>
          </nav>

          <nav className="flex flex-col gap-4.5">
            <p className="text-on-dark text-[15px] font-emphasis">
              {siteFooter.supportColumn.title}
            </p>
            <ul className="flex flex-col gap-3 text-body">
              <li>
                <Link
                  href="/legal"
                  className="text-on-dark-tertiary hover:text-on-dark transition-colors duration-250"
                >
                  {siteFooter.supportColumn.faq}
                </Link>
              </li>
              <li>
                <Link
                  href="/track-order"
                  className="text-on-dark-tertiary hover:text-on-dark transition-colors duration-250"
                >
                  {siteFooter.supportColumn.trackOrder}
                </Link>
              </li>
              <li>
                <Link
                  href="/legal"
                  className="text-on-dark-tertiary hover:text-on-dark transition-colors duration-250"
                >
                  {siteFooter.supportColumn.warranty}
                </Link>
              </li>
              <li>
                <Link
                  href="/support"
                  className="text-on-dark-tertiary hover:text-on-dark inline-flex items-center gap-1.5 transition-colors duration-250"
                >
                  {siteFooter.supportColumn.onlineChat}
                </Link>
              </li>
            </ul>
          </nav>

          {hasContact ? (
            <div className="flex flex-col gap-4.5">
              <p className="text-on-dark text-[15px] font-emphasis">
                {siteFooter.contactColumn.title}
              </p>
              <ul className="flex flex-col gap-3.5 text-body">
                {info.email ? (
                  <li className="flex items-start gap-2.5">
                    {MailIcon}
                    <a
                      dir="ltr"
                      href={`mailto:${info.email}`}
                      className="text-on-dark-tertiary hover:text-on-dark transition-colors duration-250"
                    >
                      {info.email}
                    </a>
                  </li>
                ) : null}
                {info.phone ? (
                  <li className="flex items-start gap-2.5">
                    {PhoneIcon}
                    <a
                      href={info.phone.href}
                      className="text-on-dark-tertiary hover:text-on-dark transition-colors duration-250"
                    >
                      {info.phone.display}
                    </a>
                  </li>
                ) : null}
                {info.address ? (
                  <li className="flex items-start gap-2.5">
                    {PinIcon}
                    <address className="text-on-dark-tertiary text-body leading-[1.85] not-italic">
                      {info.address}
                    </address>
                  </li>
                ) : null}
              </ul>
              <div className="flex flex-wrap items-start gap-2.5">
                {info.trustBadge ? (
                  <TrustBadge badge={info.trustBadge} size="size-16" />
                ) : null}
                <EmallsBadge size="w-[75px]" />
                <BalePayBadge width={150} />
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative mx-auto mt-[clamp(26px,4vh,44px)] flex max-w-[1240px] flex-wrap items-center justify-between gap-3.5 border-t border-white/10 pt-5">
          <div className="flex flex-wrap gap-4.5">
            <Link
              href="/legal"
              className="text-on-dark-tertiary hover:text-on-dark text-caption transition-colors duration-250"
            >
              {siteFooter.legalLinks.terms}
            </Link>
            <Link
              href="/legal"
              className="text-on-dark-tertiary hover:text-on-dark text-caption transition-colors duration-250"
            >
              {siteFooter.legalLinks.privacy}
            </Link>
          </div>
          <p className="text-on-dark-tertiary text-caption">
            {siteFooter.copyright}
          </p>
        </div>
      </footer>

      {/* موبایل — بند ۳.۳: بدون backdrop-filter */}
      <MobileFooter info={info} socials={socials} />
    </>
  );
}

function MobileFooter({
  info,
  socials,
}: {
  info: SiteInfo;
  socials: typeof socialLinks;
}) {
  const [open, setOpen] = useState({
    shop: false,
    support: false,
    contact: true,
  });
  const toggle = (key: keyof typeof open) =>
    setOpen((s) => ({ ...s, [key]: !s[key] }));

  return (
    <footer
      dir="rtl"
      className="bg-surface-dark text-on-dark relative overflow-hidden rounded-t-[24px] px-5 pt-8.5 font-sans md:hidden"
      style={{ paddingBottom: "calc(104px + env(safe-area-inset-bottom))" }}
    >
      <div
        aria-hidden="true"
        className="bg-glow-violet absolute -top-37.5 -start-27.5 h-95 w-95 rounded-full"
      />

      <div className="relative flex flex-col gap-5.5">
        <Logo
          variant="horizontal-dark"
          alt={siteFooter.logoAlt}
          className="h-8.5 self-start"
        />
        <p className="text-on-dark-tertiary text-body leading-[1.95]">
          {siteFooter.tagline}
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          {info.phone ? (
            <a
              href={info.phone.href}
              className="bg-brand text-on-dark flex min-h-13 items-center justify-center gap-2 rounded-tile text-body font-emphasis"
            >
              {PhoneIcon}
              {siteFooter.mobile.callButton}
            </a>
          ) : null}
          <Link
            href="/support"
            className="text-on-dark flex min-h-13 items-center justify-center gap-2 rounded-tile border border-white/18 text-body font-emphasis"
          >
            {siteFooter.mobile.onlineChatButton}
          </Link>
        </div>

        <div className="flex flex-col border-t border-white/10">
          <FooterAccordionSection
            title={siteFooter.shopColumn.title}
            isOpen={open.shop}
            onToggle={() => toggle("shop")}
          >
            <FooterAccordionLink href="/products">
              {siteFooter.shopColumn.gamingLaptop}
            </FooterAccordionLink>
            <FooterAccordionLink href="/products">
              {siteFooter.shopColumn.proLaptop}
            </FooterAccordionLink>
            <FooterAccordionLink href="/products">
              {siteFooter.shopColumn.monitor}
            </FooterAccordionLink>
            <FooterAccordionLink href="/products">
              {siteFooter.shopColumn.accessories}
            </FooterAccordionLink>
          </FooterAccordionSection>

          <FooterAccordionSection
            title={siteFooter.supportColumn.title}
            isOpen={open.support}
            onToggle={() => toggle("support")}
          >
            <FooterAccordionLink href="/legal">
              {siteFooter.supportColumn.faq}
            </FooterAccordionLink>
            <FooterAccordionLink href="/track-order">
              {siteFooter.supportColumn.trackOrder}
            </FooterAccordionLink>
            <FooterAccordionLink href="/legal">
              {siteFooter.supportColumn.warranty}
            </FooterAccordionLink>
          </FooterAccordionSection>

          {info.email || info.phone || info.address ? (
            <FooterAccordionSection
              title={siteFooter.contactColumn.title}
              isOpen={open.contact}
              onToggle={() => toggle("contact")}
            >
              <ul className="flex flex-col gap-3.5 border-b border-white/10 py-3.5">
                {info.email ? (
                  <li className="flex items-start gap-2.5">
                    {MailIcon}
                    <a
                      dir="ltr"
                      href={`mailto:${info.email}`}
                      className="text-on-dark-tertiary text-body"
                    >
                      {info.email}
                    </a>
                  </li>
                ) : null}
                {info.phone ? (
                  <li className="flex items-start gap-2.5">
                    {PhoneIcon}
                    <a
                      href={info.phone.href}
                      className="text-on-dark-tertiary text-body"
                    >
                      {info.phone.display}
                    </a>
                  </li>
                ) : null}
                {info.address ? (
                  <li className="flex items-start gap-2.5">
                    {PinIcon}
                    <address className="text-on-dark-tertiary text-body leading-[1.9] not-italic">
                      {info.address}
                    </address>
                  </li>
                ) : null}
              </ul>
            </FooterAccordionSection>
          ) : null}
        </div>

        <div className="flex gap-2.5">
          {socials.map((s) => (
            <a
              key={s.label}
              href={info.socials[s.key]}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              className="flex h-11 w-11 items-center justify-center rounded-icon-button border border-white/14"
            >
              {s.icon}
            </a>
          ))}
        </div>

        <div className="flex flex-wrap items-start gap-2.5">
          {info.trustBadge ? (
            <TrustBadge badge={info.trustBadge} size="size-15" />
          ) : null}
          <EmallsBadge size="w-[70px]" />
          <BalePayBadge width={140} />
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-4.5">
          <div className="flex gap-4.5">
            <Link href="/legal" className="text-on-dark-tertiary text-body">
              {siteFooter.legalLinks.terms}
            </Link>
            <Link href="/legal" className="text-on-dark-tertiary text-body">
              {siteFooter.legalLinks.privacy}
            </Link>
          </div>
          <p className="text-on-dark-tertiary text-caption">
            {siteFooter.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterAccordionSection({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="text-on-dark flex min-h-14 w-full items-center justify-between border-b border-white/10 bg-transparent p-0 font-sans text-body font-emphasis"
      >
        {title}
        <span
          className={`text-brand-on-dark block text-xl leading-none transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}
          aria-hidden="true"
        >
          +
        </span>
      </button>
      {isOpen ? <div className="py-3">{children}</div> : null}
    </div>
  );
}

function FooterAccordionLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-on-dark-tertiary flex min-h-11 items-center text-body"
    >
      {children}
    </Link>
  );
}

/** نماد اعتماد (اینماد تصویر را از سرور خودش می‌خواهد: hotlink با referrer). */
function TrustBadge({
  badge,
  size,
}: {
  badge: NonNullable<SiteInfo["trustBadge"]>;
  size: string;
}) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={badge.imageUrl}
      alt={badge.label}
      referrerPolicy="origin"
      className={`${size} rounded-tile-sm bg-white object-contain p-1`}
    />
  );
  return badge.url ? (
    <a
      href={badge.url}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="origin"
      className="self-start"
    >
      {img}
    </a>
  ) : (
    <span className="self-start">{img}</span>
  );
}

/** بج «پرداخت امن با بله» — فایل محلی (نه از تنظیمات پنل، چون فیلد
 * trust_badge فقط یک اسلات دارد و همان برای اینماد استفاده شده). */
function BalePayBadge({ width }: { width: number }) {
  const height = Math.round((width * 615) / 1320);
  return (
    <Image
      src="/trust-badges/bale-pay.webp"
      alt="پرداخت امن با بله"
      width={width}
      height={height}
      className="self-start rounded-tile-sm bg-white object-contain p-1"
    />
  );
}

/** نشان اعتباری ایمالز — کد embed ثابت خود ایمالز (نه از تنظیمات پنل)؛
 * سرور خودش تصویر امتیاز را hotlink می‌دهد، دقیقاً مثل اینماد. */
function EmallsBadge({ size }: { size: string }) {
  return (
    <a
      href="https://emalls.ir/Shop/27413/"
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="origin"
      className="self-start"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://service.emalls.ir/neshan?id=27413"
        alt="نشان اعتباری ایمالز"
        referrerPolicy="origin"
        className={`${size} rounded-tile-sm bg-white object-contain p-1`}
      />
    </a>
  );
}
