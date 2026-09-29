import type { Address, Device, Order, Profile } from "@arbyte/contracts";

const PROXY_BASE = "/api/proxy";

export async function fetchProfile(): Promise<Profile | null> {
  const res = await fetch(`${PROXY_BASE}/account/profile`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { data: Profile };
  return body.data;
}

export async function updateProfile(input: {
  firstName?: string;
  lastName?: string;
}): Promise<Profile | null> {
  const res = await fetch(`${PROXY_BASE}/account/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { data: Profile };
  return body.data;
}

export async function fetchDevices(): Promise<Device[]> {
  const res = await fetch(`${PROXY_BASE}/account/devices`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const body = (await res.json()) as { data: Device[] };
  return body.data;
}

export async function updateAddress(
  id: string,
  input: Partial<{
    recipientName: string;
    mobile: string;
    province: string;
    city: string;
    addressLine: string;
    postalCode: string;
    isDefault: boolean;
  }>,
): Promise<Address | null> {
  const res = await fetch(
    `${PROXY_BASE}/account/addresses/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  if (!res.ok) return null;
  const body = (await res.json()) as { data: Address };
  return body.data;
}

export async function deleteAddress(id: string): Promise<boolean> {
  const res = await fetch(
    `${PROXY_BASE}/account/addresses/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  return res.ok;
}

export interface AccountOrdersPage {
  orders: Order[];
  total: number;
}

export async function fetchAccountOrders(page = 1): Promise<AccountOrdersPage> {
  const res = await fetch(`${PROXY_BASE}/orders?page=${page}&perPage=20`, {
    cache: "no-store",
  });
  if (!res.ok) return { orders: [], total: 0 };
  const body = (await res.json()) as {
    data: Order[];
    meta: { pagination: { total: number } };
  };
  return {
    orders: body.data,
    total: body.meta?.pagination?.total ?? body.data.length,
  };
}
