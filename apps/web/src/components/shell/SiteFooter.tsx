"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { siteFooter } from "@arbyte/contracts";

const socialLinks = [
  {
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

export function SiteFooter() {
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
            <Image
              alt={siteFooter.logoAlt}
              src="/brand/lockup-horizontal-dark-bg.svg"
              height={34}
              width={147}
              className="self-start"
            />
            <p className="text-on-dark-tertiary max-w-[38ch] text-body leading-loose">
              {siteFooter.tagline}
            </p>
            <div className="flex flex-wrap gap-2.5">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href="#"
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
                  <i
                    className="bg-accent animate-pulse block h-1.5 w-1.5 rounded-full"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            </ul>
          </nav>

          <div className="flex flex-col gap-4.5">
            <p className="text-on-dark text-[15px] font-emphasis">
              {siteFooter.contactColumn.title}
            </p>
            <ul className="flex flex-col gap-3.5 text-body">
              <li className="flex items-start gap-2.5">
                {MailIcon}
                <a
                  dir="ltr"
                  href={`mailto:${siteFooter.contactColumn.email}`}
                  className="text-on-dark-tertiary hover:text-on-dark transition-colors duration-250"
                >
                  {siteFooter.contactColumn.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                {PhoneIcon}
                <a
                  href={siteFooter.contactColumn.phoneHref}
                  className="text-on-dark-tertiary hover:text-on-dark transition-colors duration-250"
                >
                  {siteFooter.contactColumn.phone}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                {PinIcon}
                <address className="text-on-dark-tertiary text-body leading-[1.85] not-italic">
                  {siteFooter.contactColumn.address}
                </address>
              </li>
            </ul>
            <div className="mt-0.5 flex items-center gap-2.5">
              <div className="flex h-16 w-16 items-center justify-center rounded-tile-sm border border-dashed border-white/22 bg-white/4 p-1.5 text-center text-[10.5px] leading-snug text-white/60">
                {siteFooter.contactColumn.trustBadge}
              </div>
              <div className="flex h-9.5 w-20 items-center justify-center rounded-icon-button-sm border border-dashed border-white/22 bg-white/4 text-[10.5px] text-white/60">
                {siteFooter.contactColumn.paymentGateway}
              </div>
            </div>
          </div>
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
      <MobileFooter />
    </>
  );
}

function MobileFooter() {
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
        <Image
          alt={siteFooter.logoAlt}
          src="/brand/lockup-horizontal-dark-bg.svg"
          height={30}
          width={130}
          className="self-start"
        />
        <p className="text-on-dark-tertiary text-body leading-[1.95]">
          {siteFooter.tagline}
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          <a
            href={siteFooter.contactColumn.phoneHref}
            className="bg-brand text-on-dark flex min-h-13 items-center justify-center gap-2 rounded-tile text-body font-emphasis"
          >
            {PhoneIcon}
            {siteFooter.mobile.callButton}
          </a>
          <Link
            href="/support"
            className="text-on-dark flex min-h-13 items-center justify-center gap-2 rounded-tile border border-white/18 text-body font-emphasis"
          >
            {siteFooter.mobile.onlineChatButton}
            <i
              className="bg-accent animate-pulse block h-1.5 w-1.5 rounded-full"
              aria-hidden="true"
            />
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

          <FooterAccordionSection
            title={siteFooter.contactColumn.title}
            isOpen={open.contact}
            onToggle={() => toggle("contact")}
          >
            <ul className="flex flex-col gap-3.5 border-b border-white/10 py-3.5">
              <li className="flex items-start gap-2.5">
                {MailIcon}
                <a
                  dir="ltr"
                  href={`mailto:${siteFooter.contactColumn.email}`}
                  className="text-on-dark-tertiary text-body"
                >
                  {siteFooter.contactColumn.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                {PinIcon}
                <address className="text-on-dark-tertiary text-body leading-[1.9] not-italic">
                  {siteFooter.contactColumn.address}
                </address>
              </li>
            </ul>
          </FooterAccordionSection>
        </div>

        <div className="flex gap-2.5">
          {socialLinks.map((s) => (
            <a
              key={s.label}
              href="#"
              aria-label={s.label}
              className="flex h-11 w-11 items-center justify-center rounded-icon-button border border-white/14"
            >
              {s.icon}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex h-15 w-15 items-center justify-center rounded-tile-sm border border-dashed border-white/22 bg-white/4 p-1.5 text-center text-[10.5px] leading-snug text-white/60">
            {siteFooter.contactColumn.trustBadge}
          </div>
          <div className="flex h-9.5 w-20 items-center justify-center rounded-icon-button-sm border border-dashed border-white/22 bg-white/4 text-[10.5px] text-white/60">
            {siteFooter.contactColumn.paymentGateway}
          </div>
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
