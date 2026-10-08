"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Address, Device, Profile } from "@arbyte/contracts";
import {
  accountPage,
  checkoutPage,
  formatPrice,
  orderStatusLabel,
  orderStatusPage,
  toPersianDigits,
} from "@arbyte/contracts";
import { formatDateFa } from "@arbyte/contracts/date";
import { createAddress, fetchAddresses } from "@/lib/checkout-api";
import { downloadProxyFile } from "@/lib/download-file";
import {
  deleteAddress,
  fetchAccountOrders,
  fetchDevices,
  fetchProfile,
  updateAddress,
  updateProfile,
  type AccountOrdersPage,
} from "@/lib/account-api";

function money(amount: number): string {
  return formatPrice(BigInt(amount));
}

/** همان دسته‌بندی‌های `statusVisual` صفحه‌ی سفارش (E-05 §۱)، فقط بدون آیکون. */
function orderBadgeClasses(status: string): string {
  if (status === "CANCELLED") return "bg-danger-tint text-danger";
  if (status === "AWAITING_PAYMENT" || status === "PAYMENT_REVIEW")
    return "bg-brand-tint-3 text-warning";
  if (status === "DELIVERED") return "bg-brand-tint-1 text-success-text";
  return "bg-brand-tint-2 text-brand-active";
}

const TABS = ["orders", "addresses", "devices", "info"] as const;
type Tab = (typeof TABS)[number];

function isTab(value: string | null): value is Tab {
  return TABS.includes(value as Tab);
}

interface AddressFormValues {
  recipientName: string;
  mobile: string;
  province: string;
  city: string;
  addressLine: string;
  postalCode: string;
}

const EMPTY_ADDRESS_FORM: AddressFormValues = {
  recipientName: "",
  mobile: "",
  province: "",
  city: "",
  addressLine: "",
  postalCode: "",
};

function AddressForm({
  value,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  value: AddressFormValues;
  onChange: (v: AddressFormValues) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="border-border-input grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 rounded-tile border border-dashed p-3.5">
      <label className="text-secondary-2 flex flex-col gap-1.5 text-micro">
        {checkoutPage.addressForm.recipientNameLabel}
        <input
          type="text"
          value={value.recipientName}
          onChange={(e) =>
            onChange({ ...value, recipientName: e.target.value })
          }
          placeholder={checkoutPage.addressForm.recipientNamePlaceholder}
          className="border-border-input text-primary min-h-11.5 rounded-tile border px-3.5 text-input"
        />
      </label>
      <label className="text-secondary-2 flex flex-col gap-1.5 text-micro">
        {checkoutPage.addressForm.mobileLabel}
        <input
          type="tel"
          value={value.mobile}
          onChange={(e) => onChange({ ...value, mobile: e.target.value })}
          placeholder={checkoutPage.addressForm.mobilePlaceholder}
          className="border-border-input text-primary min-h-11.5 rounded-tile border px-3.5 text-input"
        />
      </label>
      <label className="text-secondary-2 flex flex-col gap-1.5 text-micro">
        {checkoutPage.addressForm.provinceLabel}
        <input
          type="text"
          value={value.province}
          onChange={(e) => onChange({ ...value, province: e.target.value })}
          placeholder={checkoutPage.addressForm.provincePlaceholder}
          className="border-border-input text-primary min-h-11.5 rounded-tile border px-3.5 text-input"
        />
      </label>
      <label className="text-secondary-2 flex flex-col gap-1.5 text-micro">
        {checkoutPage.addressForm.cityLabel}
        <input
          type="text"
          value={value.city}
          onChange={(e) => onChange({ ...value, city: e.target.value })}
          placeholder={checkoutPage.addressForm.cityPlaceholder}
          className="border-border-input text-primary min-h-11.5 rounded-tile border px-3.5 text-input"
        />
      </label>
      <label className="text-secondary-2 flex flex-col gap-1.5 text-micro">
        {checkoutPage.addressForm.postalCodeLabel}
        <input
          type="text"
          value={value.postalCode}
          onChange={(e) => onChange({ ...value, postalCode: e.target.value })}
          placeholder={checkoutPage.addressForm.postalCodePlaceholder}
          className="border-border-input text-primary min-h-11.5 rounded-tile border px-3.5 text-input"
        />
      </label>
      <label className="text-secondary-2 col-span-full flex flex-col gap-1.5 text-micro">
        {checkoutPage.addressForm.addressLineLabel}
        <textarea
          rows={2}
          value={value.addressLine}
          onChange={(e) => onChange({ ...value, addressLine: e.target.value })}
          placeholder={checkoutPage.addressForm.addressLinePlaceholder}
          className="border-border-input text-primary resize-y rounded-tile border px-3.5 py-3 text-input leading-loose"
        />
      </label>
      <div className="col-span-full flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="bg-primary text-on-dark min-h-11.5 flex-1 rounded-tile text-body font-semibold"
        >
          {checkoutPage.addressForm.saveCta}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border-border-input text-secondary-2 min-h-11.5 rounded-tile border bg-paper px-5 text-body font-semibold"
        >
          {checkoutPage.newAddressCta.close}
        </button>
      </div>
    </div>
  );
}

export function AccountView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: Tab = isTab(tabParam) ? tabParam : "orders";

  const [profile, setProfile] = useState<Profile | null>(null);

  const [orders, setOrders] = useState<AccountOrdersPage | null>(null);
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [devices, setDevices] = useState<Device[] | null>(null);

  const [editingAddressId, setEditingAddressId] = useState<
    string | "new" | null
  >(null);
  const [addressForm, setAddressForm] =
    useState<AddressFormValues>(EMPTY_ADDRESS_FORM);
  const [savingAddress, setSavingAddress] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoSaved, setInfoSaved] = useState(false);

  const [warrantyState, setWarrantyState] = useState<
    Record<string, "idle" | "preparing" | "done">
  >({});

  useEffect(() => {
    fetchProfile().then((p) => {
      if (!p) return;
      setProfile(p);
      setFirstName(p.firstName ?? "");
      setLastName(p.lastName ?? "");
    });
  }, []);

  useEffect(() => {
    if (activeTab === "orders" && orders === null) {
      fetchAccountOrders(1).then(setOrders);
    }
    if (activeTab === "addresses" && addresses === null) {
      fetchAddresses().then(setAddresses);
    }
    if (activeTab === "devices" && devices === null) {
      fetchDevices().then(setDevices);
    }
  }, [activeTab, orders, addresses, devices]);

  const setTab = useCallback(
    (tab: Tab) => {
      router.replace(`/account?tab=${tab}`, { scroll: false });
    },
    [router],
  );

  function openNewAddressForm() {
    setAddressForm(EMPTY_ADDRESS_FORM);
    setEditingAddressId("new");
  }

  function openEditAddressForm(address: Address) {
    setAddressForm({
      recipientName: address.recipientName,
      mobile: address.mobile,
      province: address.province,
      city: address.city,
      addressLine: address.addressLine,
      postalCode: address.postalCode ?? "",
    });
    setEditingAddressId(address.id);
  }

  async function handleSaveAddress() {
    if (savingAddress) return;
    setSavingAddress(true);
    if (editingAddressId === "new") {
      const created = await createAddress(addressForm);
      if (created) setAddresses((prev) => [...(prev ?? []), created]);
    } else if (editingAddressId) {
      const updated = await updateAddress(editingAddressId, addressForm);
      if (updated) {
        setAddresses(
          (prev) =>
            prev?.map((a) => (a.id === updated.id ? updated : a)) ?? null,
        );
      }
    }
    setSavingAddress(false);
    setEditingAddressId(null);
  }

  async function handleDeleteAddress(id: string) {
    const ok = await deleteAddress(id);
    if (ok) setAddresses((prev) => prev?.filter((a) => a.id !== id) ?? null);
  }

  async function handleSetDefaultAddress(id: string) {
    const updated = await updateAddress(id, { isDefault: true });
    if (updated) {
      const fresh = await fetchAddresses();
      setAddresses(fresh);
    }
  }

  async function handleSaveInfo() {
    if (savingInfo) return;
    setSavingInfo(true);
    const updated = await updateProfile({ firstName, lastName });
    setSavingInfo(false);
    if (updated) {
      setProfile(updated);
      setInfoSaved(true);
      setTimeout(() => setInfoSaved(false), 2200);
    }
  }

  async function handleDownloadWarranty(unit: Device) {
    setWarrantyState((s) => ({ ...s, [unit.certificateId]: "preparing" }));
    const ok = await downloadProxyFile(
      `/orders/${encodeURIComponent(unit.orderNumber)}/units/${encodeURIComponent(unit.certificateId)}/warranty.pdf`,
      `${unit.certificateId}.pdf`,
    );
    setWarrantyState((s) => ({
      ...s,
      [unit.certificateId]: ok ? "done" : "idle",
    }));
    if (ok) {
      setTimeout(
        () => setWarrantyState((s) => ({ ...s, [unit.certificateId]: "idle" })),
        3000,
      );
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div>
      <section className="border-border/60 bg-paper border-b px-[5vw] py-6.5">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-4.5">
          <span className="bg-brand from-brand to-brand-active flex h-15 w-15 flex-none items-center justify-center rounded-panel-compact bg-gradient-to-br text-body font-bold text-on-dark">
            {profile?.firstName ? profile.firstName.slice(0, 1) : "؟"}
          </span>
          <div className="min-w-0 flex-1 basis-[220px]">
            <h1 className="text-primary m-0 text-[clamp(21px,2.6vw,30px)] font-bold tracking-tight">
              {profile?.firstName || profile?.lastName
                ? `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim()
                : profile
                  ? toPersianDigits(profile.mobile)
                  : "…"}
            </h1>
            {profile ? (
              <p className="text-secondary mt-1 flex flex-wrap items-center gap-2 text-caption">
                <span dir="ltr">{toPersianDigits(profile.mobile)}</span>
                <span
                  aria-hidden="true"
                  className="bg-border-input h-0.5 w-0.5 rounded-full"
                />
                <span>
                  {accountPage.memberSinceLabel}{" "}
                  {formatDateFa(new Date(profile.memberSince), "YYYY/MM")}
                </span>
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/wishlist"
              className="border-border-input text-secondary-2 flex min-h-11 items-center rounded-tile border px-4.5 text-caption font-semibold"
            >
              {accountPage.wishlistCta}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="border-border-input text-secondary-2 flex min-h-11 items-center rounded-tile border bg-paper px-4.5 text-caption font-semibold"
            >
              {accountPage.logoutCta}
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-4.5 px-[5vw] py-7">
        <nav
          aria-label="بخش‌های حساب"
          className="border-border rounded-panel bg-paper sticky top-24 flex min-w-0 flex-1 basis-[210px] flex-row gap-1 overflow-x-auto border p-2.5 md:max-w-[250px] md:flex-col"
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setTab(tab)}
              className={`flex min-h-11.5 flex-none items-center justify-between gap-2.5 rounded-tile px-3.5 text-caption font-semibold whitespace-nowrap md:flex-auto ${
                activeTab === tab
                  ? "bg-primary text-on-dark"
                  : "text-secondary-2 bg-transparent"
              }`}
            >
              {accountPage.tabs[tab]}
            </button>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 basis-[440px] flex-col gap-3.5">
          {activeTab === "orders" ? (
            <div className="flex flex-col gap-3.5">
              {orders === null ? (
                <p className="text-secondary text-center text-caption">…</p>
              ) : orders.orders.length === 0 ? (
                <div className="border-border rounded-card bg-paper flex flex-col items-center gap-2.5 border p-10 text-center">
                  <p className="text-primary m-0 text-body font-bold">
                    {accountPage.orders.emptyTitle}
                  </p>
                  <p className="text-secondary m-0 text-caption">
                    {accountPage.orders.emptyNote}
                  </p>
                  <Link
                    href="/"
                    className="bg-primary text-on-dark mt-1.5 flex min-h-11.5 items-center rounded-pill px-5.5 text-caption font-semibold"
                  >
                    {accountPage.orders.emptyCta}
                  </Link>
                </div>
              ) : (
                orders.orders.map((order) => (
                  <article
                    key={order.orderNumber}
                    className="border-border rounded-card bg-paper flex flex-col gap-3.5 border p-4.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span
                          dir="ltr"
                          className="text-primary text-caption font-bold"
                        >
                          {order.orderNumber}
                        </span>
                        <span
                          aria-hidden="true"
                          className="bg-border-input h-0.5 w-0.5 rounded-full"
                        />
                        <span className="text-secondary text-micro">
                          {formatDateFa(new Date(order.createdAt))}
                        </span>
                      </div>
                      <span
                        className={`rounded-pill px-3.5 py-1.5 text-micro font-semibold whitespace-nowrap ${orderBadgeClasses(order.status)}`}
                      >
                        {orderStatusLabel(order.status)}
                      </span>
                    </div>
                    <div className="border-border-divider flex flex-wrap items-center justify-between gap-3 border-t pt-3.5">
                      <span className="text-body font-bold">
                        {money(order.finalTotal)}
                      </span>
                      <Link
                        href={`/orders/${encodeURIComponent(order.orderNumber)}`}
                        className="border-border-input text-secondary-2 flex min-h-11 items-center rounded-tile border px-4 text-micro font-semibold"
                      >
                        {accountPage.orders.detailCta}
                      </Link>
                    </div>
                  </article>
                ))
              )}
            </div>
          ) : null}

          {activeTab === "addresses" ? (
            <div className="flex flex-col gap-3.5">
              {addresses === null ? (
                <p className="text-secondary text-center text-caption">…</p>
              ) : addresses.length === 0 && editingAddressId !== "new" ? (
                <p className="text-secondary-2 text-caption">
                  {accountPage.addresses.emptyNote}
                </p>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-3.5">
                  {(addresses ?? []).map((address) =>
                    editingAddressId === address.id ? (
                      <div key={address.id} className="col-span-full">
                        <AddressForm
                          value={addressForm}
                          onChange={setAddressForm}
                          onSave={handleSaveAddress}
                          onCancel={() => setEditingAddressId(null)}
                          saving={savingAddress}
                        />
                      </div>
                    ) : (
                      <article
                        key={address.id}
                        className={`rounded-card bg-paper flex flex-col gap-2.5 border p-4.5 ${
                          address.isDefault
                            ? "border-brand border-[1.5px]"
                            : "border-border"
                        }`}
                      >
                        <span className="text-primary flex items-center gap-2.5 text-caption font-bold">
                          {address.recipientName}
                          {address.isDefault ? (
                            <span className="bg-brand-tint-1 text-brand-active rounded-chip px-2 py-0.5 text-micro font-semibold">
                              {accountPage.addresses.defaultBadge}
                            </span>
                          ) : null}
                        </span>
                        <p className="text-secondary-2 m-0 text-body leading-loose">
                          {address.province}، {address.city}،{" "}
                          {address.addressLine}
                        </p>
                        <p className="text-secondary m-0 text-micro">
                          <span dir="ltr">
                            {toPersianDigits(address.mobile)}
                          </span>
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditAddressForm(address)}
                            className="border-border-input text-secondary-2 min-h-11 rounded-tile border bg-paper px-4 text-micro font-semibold"
                          >
                            {accountPage.addresses.editCta}
                          </button>
                          {!address.isDefault ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleSetDefaultAddress(address.id)
                              }
                              className="border-border-input text-secondary-2 min-h-11 rounded-tile border bg-paper px-4 text-micro font-semibold"
                            >
                              {accountPage.addresses.setDefaultCta}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(address.id)}
                            className="text-danger min-h-11 rounded-tile px-4 text-micro font-semibold"
                          >
                            {accountPage.addresses.deleteCta}
                          </button>
                        </div>
                      </article>
                    ),
                  )}
                </div>
              )}

              {editingAddressId === "new" ? (
                <AddressForm
                  value={addressForm}
                  onChange={setAddressForm}
                  onSave={handleSaveAddress}
                  onCancel={() => setEditingAddressId(null)}
                  saving={savingAddress}
                />
              ) : (
                <button
                  type="button"
                  onClick={openNewAddressForm}
                  className="border-border-input text-brand-active min-h-13.5 rounded-panel-compact border border-dashed bg-paper text-body font-semibold"
                >
                  {accountPage.addresses.addNewCta}
                </button>
              )}
            </div>
          ) : null}

          {activeTab === "devices" ? (
            <div className="flex flex-col gap-3.5">
              <p className="text-secondary-2 m-0 text-caption leading-loose">
                {accountPage.devices.intro}
              </p>
              {devices === null ? (
                <p className="text-secondary text-center text-caption">…</p>
              ) : devices.length === 0 ? (
                <p className="text-secondary-2 text-caption">
                  {accountPage.devices.emptyNote}
                </p>
              ) : (
                devices.map((device) => (
                  <article
                    key={device.certificateId}
                    className="border-border rounded-card bg-paper flex flex-wrap items-center gap-4 border p-4.5"
                  >
                    <div className="min-w-0 flex-1 basis-[220px]">
                      <h2 className="text-primary m-0 text-body font-bold">
                        {device.productName}
                      </h2>
                      {device.serialNumber ? (
                        <p className="text-secondary m-0 mt-1 text-micro">
                          {accountPage.devices.serialLabel}:{" "}
                          <span dir="ltr">{device.serialNumber}</span>
                        </p>
                      ) : null}
                      {device.testPeriodEndDate ? (
                        <p className="text-secondary m-0 text-micro">
                          {accountPage.devices.testPeriodEndLabel}:{" "}
                          {device.testPeriodEndDate}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-secondary-2 text-micro">
                        {accountPage.devices.warrantyLabel}
                      </span>
                      <span className="text-accent-deep text-caption font-bold">
                        {device.hasWarranty && device.warrantyEndDate
                          ? device.warrantyEndDate
                          : accountPage.devices.noWarrantyNote}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownloadWarranty(device)}
                      disabled={
                        warrantyState[device.certificateId] === "preparing"
                      }
                      className="border-border-input text-secondary-2 min-h-10.5 rounded-tile border bg-paper px-4 text-micro font-semibold whitespace-nowrap"
                    >
                      {warrantyState[device.certificateId] === "done"
                        ? orderStatusPage.invoiceDownloadDone
                        : accountPage.devices.downloadWarrantyCardCta}
                    </button>
                  </article>
                ))
              )}
            </div>
          ) : null}

          {activeTab === "info" ? (
            <div className="border-border rounded-card bg-paper flex flex-col gap-3.5 border p-5.5">
              <h2 className="text-primary m-0 text-body font-bold">
                {accountPage.info.title}
              </h2>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3.5">
                <label className="text-secondary-2 flex flex-col gap-1.5 text-micro">
                  {accountPage.info.firstNameLabel}
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      setInfoSaved(false);
                    }}
                    className="border-border-input text-primary min-h-12 rounded-tile border px-3.5 text-input"
                  />
                </label>
                <label className="text-secondary-2 flex flex-col gap-1.5 text-micro">
                  {accountPage.info.lastNameLabel}
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      setInfoSaved(false);
                    }}
                    className="border-border-input text-primary min-h-12 rounded-tile border px-3.5 text-input"
                  />
                </label>
                <label className="text-secondary-2 flex flex-col gap-1.5 text-micro">
                  {accountPage.info.mobileLabel}
                  <input
                    type="tel"
                    dir="ltr"
                    value={profile ? toPersianDigits(profile.mobile) : ""}
                    readOnly
                    aria-describedby="arb-account-phone-lock"
                    className="border-border text-secondary bg-surface-muted min-h-12 rounded-tile border px-3.5 text-input"
                  />
                  <span id="arb-account-phone-lock" className="sr-only">
                    {accountPage.info.mobileLockedNote}
                  </span>
                </label>
              </div>
              <button
                type="button"
                onClick={handleSaveInfo}
                disabled={savingInfo}
                className={`self-start ${infoSaved ? "animate-pop" : ""} flex min-h-12 items-center rounded-pill px-6.5 text-body font-semibold ${
                  infoSaved
                    ? "bg-brand-tint-1 text-brand-active"
                    : "bg-primary text-on-dark"
                }`}
              >
                {infoSaved
                  ? accountPage.info.saveDone
                  : accountPage.info.saveCta}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
