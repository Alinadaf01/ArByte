"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Cart, ShippingMethod } from "@arbyte/contracts";
import { cartPage, formatPrice, toPersianDigits } from "@arbyte/contracts";
import {
  addCartItem,
  applyCoupon,
  fetchCart,
  removeCartItem,
  removeCoupon,
  setShippingMethod,
  updateCartItemQuantity,
} from "@/lib/cart-api";
import { fetchShippingMethods } from "@/lib/checkout-api";
import { cartStore } from "@/lib/stores/cart-store";

const MIN_QTY = 1;
const MAX_QTY = 5;

function money(amount: number): string {
  return formatPrice(BigInt(amount));
}

interface RemovedLine {
  variantId: string;
  quantity: number;
}

export function CartView() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponShakeKey, setCouponShakeKey] = useState(0);
  const [couponBusy, setCouponBusy] = useState(false);
  const [shippingBusy, setShippingBusy] = useState<string | null>(null);
  const removedRef = useRef<RemovedLine[]>([]);
  const [hasRemoved, setHasRemoved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [freshCart, methods] = await Promise.all([
        fetchCart(),
        fetchShippingMethods(),
      ]);
      if (cancelled) return;
      setCart(freshCart);
      setShippingMethods(methods);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshTotalsOnly() {
    const fresh = await fetchCart();
    if (fresh) setCart(fresh);
  }

  async function handleQtyChange(itemId: string, nextQty: number) {
    if (!cart) return;
    const clamped = Math.min(MAX_QTY, Math.max(MIN_QTY, nextQty));
    const previous = cart;
    // به‌روزرسانی خوش‌بینانه — فقط ردیف (تعداد/جمع همان ردیف)، نه خلاصه‌ی
    // کل (تخفیف/ارسال دوباره از سرور اعتبارسنجی می‌خواهند، حدس زدنشان ریسک دارد).
    setCart({
      ...cart,
      items: cart.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: clamped,
              lineTotal: item.variant.price.final * clamped,
            }
          : item,
      ),
    });
    const updated = await updateCartItemQuantity(itemId, clamped);
    if (updated) {
      setCart(updated);
      void cartStore.refresh();
    } else {
      setCart(previous);
    }
  }

  async function handleRemove(
    itemId: string,
    variantId: string,
    quantity: number,
  ) {
    if (!cart) return;
    const previous = cart;
    setCart({
      ...cart,
      items: cart.items.filter((item) => item.id !== itemId),
    });
    const updated = await removeCartItem(itemId);
    if (updated) {
      removedRef.current = [...removedRef.current, { variantId, quantity }];
      setHasRemoved(true);
      setCart(updated);
      void cartStore.refresh();
    } else {
      setCart(previous);
    }
  }

  async function handleRestore() {
    const toRestore = removedRef.current;
    removedRef.current = [];
    setHasRemoved(false);
    for (const line of toRestore) {
      await addCartItem(line.variantId, line.quantity);
    }
    await refreshTotalsOnly();
    void cartStore.refresh();
  }

  async function handleApplyCoupon() {
    if (!couponInput.trim() || couponBusy) return;
    setCouponBusy(true);
    setCouponError(null);
    const result = await applyCoupon(couponInput.trim());
    setCouponBusy(false);
    if (result.ok) {
      setCart(result.cart);
      setCouponInput("");
    } else {
      setCouponError(result.message);
      setCouponShakeKey((k) => k + 1);
    }
  }

  async function handleRemoveCoupon() {
    const updated = await removeCoupon();
    if (updated) setCart(updated);
  }

  async function handleSelectShipping(methodId: string) {
    if (shippingBusy) return;
    setShippingBusy(methodId);
    const updated = await setShippingMethod(methodId);
    if (updated) setCart(updated);
    setShippingBusy(null);
  }

  if (loading || !cart) {
    return (
      <div className="mx-auto max-w-[1240px] px-[5vw] py-16 text-center text-secondary">
        …
      </div>
    );
  }

  const isEmpty = cart.items.length === 0;

  return (
    <div>
      <section className="border-border/60 bg-paper border-b px-[5vw] py-7">
        <div className="mx-auto max-w-[1240px]">
          <nav
            aria-label="مسیر"
            className="text-secondary-2 mb-3.5 flex items-center gap-2 text-caption"
          >
            <Link href="/" className="text-secondary-2">
              {cartPage.breadcrumbHome}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-primary font-semibold">
              {cartPage.breadcrumbCurrent}
            </span>
          </nav>
          <div className="flex flex-wrap items-end justify-between gap-4.5">
            <h1 className="text-primary m-0 text-[clamp(26px,3.2vw,40px)] font-bold tracking-tight">
              {cartPage.title}
            </h1>
            <p className="text-secondary-2 m-0 text-caption">
              {cartPage.lineCountNote(toPersianDigits(cart.items.length))}
            </p>
          </div>
          <ol className="mt-4.5 flex flex-wrap items-center gap-2.5 p-0">
            {cartPage.steps.map((label, i) => (
              <li key={label} className="contents">
                <span
                  className={`flex items-center gap-2 text-body font-semibold ${i === 0 ? "text-primary" : "text-secondary-2"}`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-caption ${
                      i === 0
                        ? "bg-primary text-on-dark"
                        : "border-border-input border"
                    }`}
                  >
                    {toPersianDigits(i + 1)}
                  </span>
                  {label}
                </span>
                {i < cartPage.steps.length - 1 ? (
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
          {isEmpty ? (
            <div className="border-border rounded-card bg-paper border p-10 text-center">
              <p className="text-primary m-0 mb-2 text-lg font-bold">
                {cartPage.emptyState.title}
              </p>
              <p className="text-secondary-2 m-0 mb-5 text-body leading-loose">
                {cartPage.emptyState.body}
              </p>
              <div className="flex flex-wrap justify-center gap-2.5">
                <Link
                  href="/products"
                  className="bg-primary text-on-dark flex min-h-11.5 items-center rounded-pill px-6 text-body font-semibold"
                >
                  {cartPage.emptyState.shopCta}
                </Link>
                {hasRemoved ? (
                  <button
                    type="button"
                    onClick={handleRestore}
                    className="border-border-input text-secondary-2 flex min-h-11.5 items-center rounded-pill border bg-paper px-5.5 text-body font-semibold"
                  >
                    {cartPage.emptyState.restoreCta}
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            cart.items.map((item) => (
              <article
                key={item.id}
                className="border-border rounded-card bg-paper grid grid-cols-[76px_minmax(0,1fr)] gap-3.5 border p-3.5 md:grid-cols-[96px_minmax(0,1fr)] md:gap-4"
              >
                <Link
                  href={`/products/${item.variant.productSlug}`}
                  className="bg-brand-tint-2 block h-19 w-19 overflow-hidden rounded-tile md:h-24 md:w-24"
                >
                  {item.variant.image ? (
                    <Image
                      src={item.variant.image}
                      alt={item.variant.productName}
                      width={96}
                      height={96}
                      className="h-full w-full object-contain"
                    />
                  ) : null}
                </Link>
                <div className="flex min-w-0 flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="m-0 text-body font-bold leading-loose">
                        <Link
                          href={`/products/${item.variant.productSlug}`}
                          className="text-primary"
                        >
                          {item.variant.productName}
                        </Link>
                      </h2>
                      <p className="text-secondary-2 m-0 mt-1 text-caption">
                        {item.variant.label}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleRemove(item.id, item.variant.id, item.quantity)
                      }
                      aria-label={cartPage.removeAriaLabel}
                      className="hover:bg-danger-tint hover:text-danger text-secondary-2 flex h-11 w-11 flex-none items-center justify-center rounded-tile-sm"
                    >
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
                        <path d="M5 7h14" />
                        <path d="M9.5 7V5.5h5V7" />
                        <path d="M6.8 7 7.6 19h8.8L17.2 7" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="border-border-input flex items-center gap-0.5 rounded-pill border bg-paper p-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          handleQtyChange(item.id, item.quantity - 1)
                        }
                        aria-label={cartPage.decreaseAriaLabel}
                        className="hover:bg-brand-tint-3 text-secondary-2 flex h-11 w-11 items-center justify-center rounded-full text-lg"
                      >
                        −
                      </button>
                      <span className="min-w-7 text-center text-body font-semibold">
                        {toPersianDigits(item.quantity)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleQtyChange(item.id, item.quantity + 1)
                        }
                        aria-label={cartPage.increaseAriaLabel}
                        className="hover:bg-brand-tint-3 text-secondary-2 flex h-11 w-11 items-center justify-center rounded-full text-lg"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-body font-bold tracking-tight whitespace-nowrap">
                        {money(item.lineTotal)}
                      </span>
                      <span className="text-secondary-2 text-caption whitespace-nowrap">
                        {item.quantity > 1
                          ? cartPage.unitPriceMultiple(
                              money(item.variant.price.final),
                            )
                          : cartPage.unitPriceLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}

          {!isEmpty ? (
            <div className="border-border rounded-panel bg-paper flex flex-wrap items-center justify-between gap-3 border p-4">
              <p className="text-secondary-2 m-0 text-body leading-loose">
                {cartPage.supportNote}
              </p>
              <Link
                href="/support"
                className="text-primary text-caption font-semibold whitespace-nowrap"
              >
                {cartPage.supportCta}
              </Link>
            </div>
          ) : null}
        </div>

        {!isEmpty ? (
          <aside className="sticky top-24 flex min-w-0 flex-1 basis-[300px] flex-col gap-3.5 md:max-w-[380px]">
            <div className="border-border rounded-panel bg-paper flex flex-col gap-4 border p-5">
              <p className="text-primary m-0 text-body font-bold">
                {cartPage.shippingSectionTitle}
              </p>
              <div className="flex flex-col gap-2">
                {shippingMethods.map((method) => {
                  const active = cart.shippingMethod?.id === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => handleSelectShipping(method.id)}
                      disabled={shippingBusy === method.id}
                      className={`flex items-center justify-between gap-3 rounded-tile p-3.5 text-start transition-colors duration-200 ${
                        active
                          ? "bg-brand-tint-2 border-brand border-[1.5px]"
                          : "border-border-input border-[1.5px] bg-paper"
                      }`}
                    >
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-primary text-caption font-semibold">
                          {method.name}
                        </span>
                        <span className="text-secondary-2 text-micro">
                          {method.estimatedDays}
                        </span>
                      </span>
                      <span
                        className={`text-caption font-semibold whitespace-nowrap ${active ? "text-brand-active" : "text-secondary-2"}`}
                      >
                        {method.cost === 0
                          ? cartPage.freeLabel
                          : money(method.cost)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-border rounded-panel bg-paper flex flex-col gap-3.5 border p-5">
              <label
                htmlFor="cart-coupon"
                className="text-primary text-body font-bold"
              >
                {cartPage.couponLabel}
              </label>
              {cart.coupon ? (
                <div className="bg-brand-tint-2 flex items-center justify-between gap-2 rounded-tile px-3.5 py-2.5">
                  <span className="text-caption font-semibold">
                    {cartPage.couponAppliedNote(cart.coupon.code)}
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-danger text-caption font-semibold"
                  >
                    {cartPage.couponRemoveCta}
                  </button>
                </div>
              ) : (
                <>
                  <div
                    key={couponShakeKey}
                    className={`grid grid-cols-[minmax(0,1fr)_auto] gap-2 ${couponError ? "animate-shake" : ""}`}
                  >
                    <input
                      id="cart-coupon"
                      type="text"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value);
                        setCouponError(null);
                      }}
                      placeholder={cartPage.couponPlaceholder}
                      className={`min-h-11 min-w-0 rounded-tile-sm border px-3.5 text-caption ${couponError ? "border-danger" : "border-border-input"}`}
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponBusy}
                      className="bg-primary text-on-dark min-h-11 rounded-tile-sm px-4.5 text-caption font-semibold"
                    >
                      {cartPage.couponApplyCta}
                    </button>
                  </div>
                  <p
                    className={`m-0 text-micro leading-relaxed ${couponError ? "text-danger" : "text-secondary-2"}`}
                  >
                    {couponError ?? cartPage.couponDefaultNote}
                  </p>
                </>
              )}
            </div>

            <div className="border-border rounded-panel bg-paper flex flex-col gap-3 border p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-secondary-2 text-body">
                  {cartPage.subtotalLabel}
                </span>
                <span className="text-caption font-medium">
                  {money(cart.subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-secondary-2 text-body">
                  {cartPage.discountLabel}
                </span>
                <span
                  className={`text-caption font-medium ${cart.discountTotal ? "text-accent-deep" : ""}`}
                >
                  {cart.discountTotal ? `− ${money(cart.discountTotal)}` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-secondary-2 text-body">
                  {cartPage.shippingLabel}
                </span>
                <span className="text-caption font-medium">
                  {cart.shippingMethod
                    ? cart.shippingCost === 0
                      ? cartPage.freeLabel
                      : money(cart.shippingCost)
                    : "—"}
                </span>
              </div>
              <div className="border-border-divider flex items-baseline justify-between gap-3 border-t pt-3.5">
                <span className="text-body font-bold">
                  {cartPage.totalLabel}
                </span>
                <span className="text-[clamp(18px,2.2vw,22px)] font-bold tracking-tight whitespace-nowrap">
                  {money(cart.finalTotal)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => router.push("/checkout")}
                className="bg-primary text-on-dark mt-1 flex min-h-12.5 items-center justify-center rounded-pill text-body font-semibold"
              >
                {cartPage.continueCta}
              </button>
              <p className="text-secondary-2 m-0 flex items-center justify-center gap-1.5 text-micro">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-brand)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
                  <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
                </svg>
                {cartPage.secureNote}
              </p>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
