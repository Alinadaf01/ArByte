"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Cart, PaymentPlan } from "@arbyte/contracts";
import { checkoutPage, formatPrice, toPersianDigits } from "@arbyte/contracts";
import { fetchCart } from "@/lib/cart-api";
import {
  createAddress,
  createOrder,
  fetchAddresses,
  fetchPaymentPlans,
  type CreateAddressInput,
  type PaymentPlanList,
} from "@/lib/checkout-api";

type Address = Awaited<ReturnType<typeof fetchAddresses>>[number];
type InvoiceType = "PERSONAL" | "CORPORATE";

function money(amount: number): string {
  return formatPrice(BigInt(amount));
}

const EMPTY_NEW_ADDRESS: CreateAddressInput = {
  recipientName: "",
  mobile: "",
  province: "",
  city: "",
  addressLine: "",
  postalCode: "",
};

export function CheckoutView() {
  const router = useRouter();
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlanList | null>(
    null,
  );

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddress, setNewAddress] =
    useState<CreateAddressInput>(EMPTY_NEW_ADDRESS);
  const [savingAddress, setSavingAddress] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("PERSONAL");
  const [companyName, setCompanyName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [economicCode, setEconomicCode] = useState("");

  const [placing, setPlacing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [freshCart, addressList, plans] = await Promise.all([
        fetchCart(),
        fetchAddresses(),
        fetchPaymentPlans(),
      ]);
      if (cancelled) return;
      if (!freshCart || freshCart.items.length === 0) {
        router.replace("/cart");
        return;
      }
      setCart(freshCart);
      setAddresses(addressList);
      setPaymentPlans(plans);
      const defaultAddress =
        addressList.find((a) => a.isDefault) ?? addressList[0];
      if (defaultAddress) setSelectedAddressId(defaultAddress.id);
      else setShowNewAddressForm(true);
      // پیش‌فرض: اولین روش در دسترس (آنلاین زیر سقف، وگرنه واریز).
      const firstAvailable = plans?.plans.find((p) => p.available);
      if (firstAvailable) setSelectedPlan(firstAvailable.plan);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSaveAddress() {
    if (savingAddress) return;
    setSavingAddress(true);
    const created = await createAddress(newAddress);
    setSavingAddress(false);
    if (created) {
      setAddresses((prev) => [...prev, created]);
      setSelectedAddressId(created.id);
      setShowNewAddressForm(false);
      setNewAddress(EMPTY_NEW_ADDRESS);
    }
  }

  async function handlePlaceOrder() {
    if (!cart || !selectedAddressId || !selectedPlan || placing) return;
    if (
      invoiceType === "CORPORATE" &&
      (!companyName.trim() || !nationalId.trim())
    ) {
      setFieldErrors({
        companyName: "برای فاکتور حقوقی، نام شرکت و شناسه ملی الزامی است.",
      });
      return;
    }

    setPlacing(true);
    setFieldErrors({});
    setGeneralError(null);

    const result = await createOrder(
      {
        addressId: selectedAddressId,
        paymentPlan: selectedPlan,
        invoiceType,
        companyName: invoiceType === "CORPORATE" ? companyName : undefined,
        nationalId: invoiceType === "CORPORATE" ? nationalId : undefined,
        economicCode:
          invoiceType === "CORPORATE" ? economicCode || undefined : undefined,
      },
      idempotencyKeyRef.current,
    );

    if (!result.ok) {
      setPlacing(false);
      if (
        result.code === "PRICE_CHANGED" ||
        result.code === "INSUFFICIENT_STOCK"
      ) {
        setFieldErrors(result.fieldErrors ?? {});
        setGeneralError(result.message);
        const fresh = await fetchCart();
        if (fresh) setCart(fresh);
      } else {
        setGeneralError(result.message);
      }
      return;
    }

    // پرداخت آنلاین/ترکیبی در صفحه‌ی سفارش ادامه می‌یابد («باز کردن بله» با کلیک
    // خود کاربر، تا مرورگر/سیستم‌عامل باز شدن اپ را مسدود نکند).
    router.push(`/orders/${result.order.orderNumber}`);
  }

  if (loading || !cart) {
    return (
      <div className="mx-auto max-w-[1240px] px-[5vw] py-16 text-center text-secondary">
        …
      </div>
    );
  }

  const selectedOption = paymentPlans?.plans.find(
    (p) => p.plan === selectedPlan,
  );
  const canPlaceOrder =
    !!selectedAddressId && !!selectedOption?.available && !placing;

  return (
    <div>
      <section className="border-border/60 bg-paper border-b px-[5vw] py-6.5">
        <div className="mx-auto max-w-[1240px]">
          <h1 className="text-primary m-0 text-[clamp(26px,3.2vw,40px)] font-bold tracking-tight">
            {checkoutPage.title}
          </h1>
          <ol className="mt-4.5 flex flex-wrap items-center gap-2.5 p-0">
            {checkoutPage.steps.map((label, i) => (
              <li key={label} className="contents">
                <span
                  className={`flex items-center gap-2 text-body font-semibold ${i === 1 ? "text-primary" : "text-secondary-2"}`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-caption ${
                      i === 1
                        ? "bg-primary text-on-dark"
                        : i === 0
                          ? "bg-brand-tint-1 text-brand-active"
                          : "border-border-input border"
                    }`}
                  >
                    {i === 0 ? "✓" : toPersianDigits(i + 1)}
                  </span>
                  {label}
                </span>
                {i < checkoutPage.steps.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="bg-border-input h-px w-6.5"
                  />
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-4.5 px-[5vw] py-7">
        <div className="flex min-w-0 flex-1 basis-[420px] flex-col gap-3.5">
          <section className="border-border rounded-panel bg-paper flex flex-col gap-3.5 border p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-primary m-0 text-body font-bold">
                {checkoutPage.addressSectionTitle}
              </h2>
              <button
                type="button"
                onClick={() => setShowNewAddressForm((s) => !s)}
                className="border-border-input text-secondary-2 flex min-h-11 items-center rounded-tile border bg-paper px-4 text-caption font-semibold whitespace-nowrap"
              >
                {showNewAddressForm
                  ? checkoutPage.newAddressCta.close
                  : checkoutPage.newAddressCta.open}
              </button>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-2.5">
              {addresses.map((address) => {
                const active = selectedAddressId === address.id;
                return (
                  <button
                    key={address.id}
                    type="button"
                    onClick={() => setSelectedAddressId(address.id)}
                    className={`flex flex-col items-start gap-1.5 rounded-tile p-3.5 text-start ${
                      active
                        ? "bg-brand-tint-2 border-brand border-[1.5px]"
                        : "border-border-input border-[1.5px] bg-paper"
                    }`}
                  >
                    <span className="text-primary flex items-center gap-2 text-caption font-semibold">
                      {address.recipientName}
                      {address.isDefault ? (
                        <span className="bg-brand-tint-1 text-brand-active rounded-chip px-2 py-0.5 text-micro font-semibold">
                          {checkoutPage.addressDefaultBadge}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-secondary-2 text-micro leading-relaxed">
                      {address.province}، {address.city}، {address.addressLine}
                    </span>
                    <span className="text-secondary text-micro">
                      {toPersianDigits(address.mobile)}
                    </span>
                  </button>
                );
              })}
            </div>

            {showNewAddressForm ? (
              <div className="border-border-divider grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 border-t pt-3.5">
                <label className="text-secondary-2 flex flex-col gap-1.5 text-micro">
                  {checkoutPage.addressForm.recipientNameLabel}
                  <input
                    type="text"
                    value={newAddress.recipientName}
                    onChange={(e) =>
                      setNewAddress((s) => ({
                        ...s,
                        recipientName: e.target.value,
                      }))
                    }
                    placeholder={
                      checkoutPage.addressForm.recipientNamePlaceholder
                    }
                    className="border-border-input text-primary min-h-11.5 rounded-tile border px-3.5 text-input"
                  />
                </label>
                <label className="text-secondary-2 flex flex-col gap-1.5 text-micro">
                  {checkoutPage.addressForm.mobileLabel}
                  <input
                    type="tel"
                    value={newAddress.mobile}
                    onChange={(e) =>
                      setNewAddress((s) => ({ ...s, mobile: e.target.value }))
                    }
                    placeholder={checkoutPage.addressForm.mobilePlaceholder}
                    className="border-border-input text-primary min-h-11.5 rounded-tile border px-3.5 text-input"
                  />
                </label>
                <label className="text-secondary-2 flex flex-col gap-1.5 text-micro">
                  {checkoutPage.addressForm.provinceLabel}
                  <input
                    type="text"
                    value={newAddress.province}
                    onChange={(e) =>
                      setNewAddress((s) => ({ ...s, province: e.target.value }))
                    }
                    placeholder={checkoutPage.addressForm.provincePlaceholder}
                    className="border-border-input text-primary min-h-11.5 rounded-tile border px-3.5 text-input"
                  />
                </label>
                <label className="text-secondary-2 flex flex-col gap-1.5 text-micro">
                  {checkoutPage.addressForm.cityLabel}
                  <input
                    type="text"
                    value={newAddress.city}
                    onChange={(e) =>
                      setNewAddress((s) => ({ ...s, city: e.target.value }))
                    }
                    placeholder={checkoutPage.addressForm.cityPlaceholder}
                    className="border-border-input text-primary min-h-11.5 rounded-tile border px-3.5 text-input"
                  />
                </label>
                <label className="text-secondary-2 flex flex-col gap-1.5 text-micro">
                  {checkoutPage.addressForm.postalCodeLabel}
                  <input
                    type="text"
                    value={newAddress.postalCode}
                    onChange={(e) =>
                      setNewAddress((s) => ({
                        ...s,
                        postalCode: e.target.value,
                      }))
                    }
                    placeholder={checkoutPage.addressForm.postalCodeLabel}
                    className="border-border-input text-primary min-h-11.5 rounded-tile border px-3.5 text-input"
                  />
                </label>
                <label className="text-secondary-2 col-span-full flex flex-col gap-1.5 text-micro">
                  {checkoutPage.addressForm.addressLineLabel}
                  <textarea
                    rows={2}
                    value={newAddress.addressLine}
                    onChange={(e) =>
                      setNewAddress((s) => ({
                        ...s,
                        addressLine: e.target.value,
                      }))
                    }
                    placeholder={
                      checkoutPage.addressForm.addressLinePlaceholder
                    }
                    className="border-border-input text-primary resize-y rounded-tile border px-3.5 py-3 text-input leading-loose"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleSaveAddress}
                  disabled={savingAddress}
                  className="bg-primary text-on-dark col-span-full min-h-11.5 rounded-tile text-body font-semibold"
                >
                  {checkoutPage.addressForm.saveCta}
                </button>
              </div>
            ) : null}
          </section>

          <section className="border-border rounded-panel bg-paper flex flex-col gap-3.5 border p-5">
            <h2 className="text-primary m-0 text-body font-bold">
              {checkoutPage.paymentSectionTitle}
            </h2>
            {!paymentPlans || paymentPlans.plans.every((p) => !p.available) ? (
              <p className="text-secondary-2 m-0 text-caption">
                {checkoutPage.noPaymentMethodsNote}
              </p>
            ) : (
              <div role="radiogroup" className="flex flex-col gap-2.5">
                {paymentPlans.plans.map((option) => {
                  const copy = checkoutPage.paymentPlans[option.plan];
                  const active = selectedPlan === option.plan;
                  return (
                    <button
                      key={option.plan}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-disabled={!option.available}
                      disabled={!option.available}
                      onClick={() => setSelectedPlan(option.plan)}
                      className={`flex items-start gap-3 rounded-tile p-4 text-start transition-colors ${
                        !option.available
                          ? "border-border bg-surface-muted cursor-not-allowed border-[1.5px] opacity-70"
                          : active
                            ? "bg-brand-tint-2 border-brand border-[1.5px]"
                            : "border-border-input border-[1.5px] bg-paper"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-1 h-4 w-4 flex-none rounded-full border-2 ${
                          active
                            ? "border-brand bg-brand"
                            : "border-border-input"
                        }`}
                      />
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="text-primary flex flex-wrap items-center gap-2 text-body font-semibold">
                          {copy.title}
                          {!option.available ? (
                            <span className="text-secondary-2 text-micro font-medium">
                              {checkoutPage.paymentPlans.unavailableBadge}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-secondary text-caption leading-relaxed">
                          {copy.description}
                        </span>
                        {option.plan === "ONLINE" ? (
                          <span className="text-secondary-2 text-micro">
                            {checkoutPage.paymentPlans.ONLINE.limitNote(
                              money(paymentPlans.onlineLimit),
                            )}
                          </span>
                        ) : null}
                        {option.plan === "COMBINED" && option.available ? (
                          <span className="text-primary text-caption font-medium">
                            {checkoutPage.paymentPlans.COMBINED.split(
                              money(option.onlineAmount),
                              money(option.bankAmount),
                            )}
                          </span>
                        ) : null}
                        {!option.available && option.reason ? (
                          <span className="text-warning text-micro font-medium">
                            {option.reason}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="border-border rounded-panel bg-paper flex flex-col gap-3.5 border p-5">
            <h2 className="text-primary m-0 text-body font-bold">
              {checkoutPage.invoiceSectionTitle}
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setInvoiceType("PERSONAL")}
                className={`min-h-11 rounded-tile px-5 text-caption font-medium ${
                  invoiceType === "PERSONAL"
                    ? "bg-primary text-on-dark"
                    : "border-border-input text-secondary-2 border bg-paper"
                }`}
              >
                {checkoutPage.invoicePersonalCta}
              </button>
              <button
                type="button"
                onClick={() => setInvoiceType("CORPORATE")}
                className={`min-h-11 rounded-tile px-5 text-caption font-medium ${
                  invoiceType === "CORPORATE"
                    ? "bg-primary text-on-dark"
                    : "border-border-input text-secondary-2 border bg-paper"
                }`}
              >
                {checkoutPage.invoiceCorporateCta}
              </button>
            </div>
            {invoiceType === "CORPORATE" ? (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
                <label className="text-secondary-2 flex flex-col gap-1.5 text-micro">
                  {checkoutPage.invoiceForm.companyNameLabel}
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={
                      checkoutPage.invoiceForm.companyNamePlaceholder
                    }
                    className="border-border-input text-primary min-h-11.5 rounded-tile border px-3.5 text-input"
                  />
                </label>
                <label className="text-secondary-2 flex flex-col gap-1.5 text-micro">
                  {checkoutPage.invoiceForm.nationalIdLabel}
                  <input
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder={checkoutPage.invoiceForm.nationalIdPlaceholder}
                    className="border-border-input text-primary min-h-11.5 rounded-tile border px-3.5 text-input"
                  />
                </label>
                <label className="text-secondary-2 flex flex-col gap-1.5 text-micro">
                  {checkoutPage.invoiceForm.economicCodeLabel}
                  <input
                    type="text"
                    value={economicCode}
                    onChange={(e) => setEconomicCode(e.target.value)}
                    placeholder={
                      checkoutPage.invoiceForm.economicCodePlaceholder
                    }
                    className="border-border-input text-primary min-h-11.5 rounded-tile border px-3.5 text-input"
                  />
                </label>
              </div>
            ) : null}
            {fieldErrors.companyName ? (
              <p className="text-danger m-0 text-caption">
                {fieldErrors.companyName}
              </p>
            ) : null}
          </section>
        </div>

        <aside className="sticky top-24 flex min-w-0 flex-1 basis-[300px] flex-col gap-3.5 md:max-w-[380px]">
          <div className="border-border rounded-panel bg-paper flex flex-col gap-3.5 border p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-primary m-0 text-caption font-bold">
                {checkoutPage.summaryTitle}
              </h2>
              <Link
                href="/cart"
                className="text-primary text-micro font-semibold"
              >
                {checkoutPage.editCta}
              </Link>
            </div>
            <div className="flex flex-col gap-2.5">
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3"
                >
                  <span className="text-secondary min-w-0 text-body leading-relaxed">
                    {item.variant.productName} ·{" "}
                    {toPersianDigits(item.quantity)}
                  </span>
                  <span className="text-body font-medium whitespace-nowrap">
                    {money(item.lineTotal)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-border-divider flex flex-col gap-2.5 border-t pt-3.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-secondary-2 text-body">
                  {checkoutPage.discountLabel}
                </span>
                <span
                  className={`text-caption font-medium ${cart.discountTotal ? "text-accent-deep" : ""}`}
                >
                  {cart.discountTotal ? `− ${money(cart.discountTotal)}` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-secondary-2 text-body">
                  {checkoutPage.shippingLabel}
                </span>
                <span className="text-caption font-medium">
                  {cart.shippingMethod
                    ? cart.shippingCost === 0
                      ? "رایگان"
                      : money(cart.shippingCost)
                    : "—"}
                </span>
              </div>
            </div>
            <div className="border-border-divider flex items-baseline justify-between gap-3 border-t pt-3.5">
              <span className="text-body font-bold">
                {checkoutPage.totalLabel}
              </span>
              <span className="text-[clamp(18px,2.2vw,22px)] font-bold tracking-tight whitespace-nowrap">
                {money(cart.finalTotal)}
              </span>
            </div>

            {generalError ? (
              <p className="text-danger m-0 text-caption">{generalError}</p>
            ) : null}
            {Object.entries(fieldErrors)
              .filter(([key]) => key !== "companyName")
              .map(([variantId, message]) => (
                <p key={variantId} className="text-danger m-0 text-caption">
                  {message}
                </p>
              ))}
            {fieldErrors &&
            Object.keys(fieldErrors).some((k) => k !== "companyName") ? (
              <Link
                href="/cart"
                className="text-primary text-caption font-semibold"
              >
                {checkoutPage.editCta}
              </Link>
            ) : null}

            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={!canPlaceOrder}
              className={`mt-1 flex min-h-12.5 items-center justify-center gap-2.5 rounded-pill text-body font-semibold ${
                canPlaceOrder
                  ? "bg-primary text-on-dark"
                  : "text-secondary bg-brand-tint-3 cursor-not-allowed"
              }`}
            >
              {placing ? (
                <span
                  aria-hidden="true"
                  className="border-on-dark/35 border-t-on-dark h-4.5 w-4.5 flex-none animate-spin rounded-full border-2"
                />
              ) : null}
              {placing
                ? checkoutPage.placeOrderCta.placingCardToCard
                : checkoutPage.placeOrderCta.idle}
            </button>
            <p className="text-secondary-2 m-0 text-center text-micro leading-relaxed">
              {checkoutPage.legalNote}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
